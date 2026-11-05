import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";
import { createHmac, timingSafeEqual } from "node:crypto";

type Payload = {
  id: string;
  type: "image" | "video";
  model: string;
  input: Record<string, unknown>;
};

type Job = {
  id: string;
  status: "queued" | "pending" | "processing" | "completed" | "failed";
  resultUrl?: string;
  error?: string;
  model?: string;
  updatedAt: string;
};

function validSession(cookieHeader: string) {
  const match = cookieHeader.match(/(?:^|;\s*)nova_studio_session=([^;]+)/);
  const token = match?.[1];
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) return false;

  const [timestamp, supplied] = decodeURIComponent(token).split(".");
  if (!timestamp  !supplied  !/^\d+$/.test(timestamp)) return false;

  const issuedAt = Number(timestamp);
  if (
    !Number.isFinite(issuedAt) ||
    issuedAt > Date.now() + 60_000 ||
    Date.now() - issuedAt > 14 * 24 * 60 * 60 * 1000
  ) return false;

  const expected = createHmac("sha256", secret).update(timestamp).digest("hex");
  const a = Buffer.from(supplied, "hex");
  const b = Buffer.from(expected, "hex");

  return a.length === b.length && timingSafeEqual(a, b);
}
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function save(store: ReturnType<typeof getStore>, job: Job) {
  job.updatedAt = new Date().toISOString();
  await store.setJSON(job.id, job);
}

export default async (req: Request) => {
  const store = getStore("nova-studio-generation-jobs");

  try {
    if (!validSession(req.headers.get("cookie") || "")) {
      console.error("Background generation rejected: invalid session.");
      return;
    }

    const payload = await req.json() as Payload;
    if (!payload?.id || !/^[a-f0-9-]{36}$/i.test(payload.id) || !payload.model || !payload.input?.prompt) {
      console.error("Background generation rejected: invalid payload.");
      return;
    }

    const apiKey = process.env.POLZA_API_KEY;
    if (!apiKey) {
      await save(store, { id: payload.id, status: "failed", error: "POLZA_API_KEY не настроен в Netlify.", model: payload.model, updatedAt: "" });
      return;
    }

    const job: Job = { id: payload.id, status: "pending", model: payload.model, updatedAt: "" };
    await save(store, job);

    const start = await fetch("https://polza.ai/api/v1/media", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model: payload.model, input: payload.input, async: true }),
      signal: AbortSignal.timeout(120_000),
      cache: "no-store"
    });

    const started = await start.json().catch(() => ({})) as Record<string, any>;
    if (!start.ok) {
      const message = typeof started.error === "string" ? started.error : `Polza.ai отклонил запрос (${start.status}).`;
      await save(store, { ...job, status: "failed", error: message });
      return;
    }

    const mediaId = started.id;
    if (!mediaId || typeof mediaId !== "string") {
      await save(store, { ...job, status: "failed", error: "Polza.ai не вернул ID задачи." });
      return;
    }

    const maxWait = 13 * 60 * 1000;
    const interval = payload.type === "image" ? 4000 : 8000;
    const deadline = Date.now() + maxWait;

    while (Date.now() < deadline) {
      const stateResponse = await fetch(`https://polza.ai/api/v1/media/${encodeURIComponent(mediaId)}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: "no-store",
        signal: AbortSignal.timeout(25_000)
      });

      const state = await stateResponse.json().catch(() => ({})) as Record<string, any>;
      if (!stateResponse.ok) {
        if (stateResponse.status >= 500 || stateResponse.status === 408 || stateResponse.status === 429) {
          await sleep(interval);
          continue;
        }
        await save(store, { ...job, status: "failed", error: typeof state.error === "string" ? state.error : `Не удалось получить статус Polza.ai (${stateResponse.status}).` });
        return;
      }

      if (state.status === "completed") {
        const resultUrl = state.data?.url || state.data?.[0]?.url;
        if (!resultUrl || typeof resultUrl !== "string") {
          await save(store, { ...job, status: "failed", error: "Генерация завершилась, но Polza.ai не вернул ссылку на файл." });
          return;
        }
        await save(store, { ...job, status: "completed", resultUrl });
        return;
      }

      if (state.status === "failed" || state.status === "cancelled") {
        const message = typeof state.error === "string" ? state.error : state.error?.message || "Модель не смогла выполнить генерацию.";
        await save(store, { ...job, status: "failed", error: message });
        return;
      }

      await save(store, { ...job, status: state.status === "processing" ? "processing" : "pending" });
      await sleep(interval);
    }

    await save(store, { ...job, status: "failed", error: "Превышено время ожидания генерации. Задача могла продолжить обработку у провайдера, проверь историю Polza.ai." });
  } catch (error) {
    console.error("NOVA background generation failed:", error);
    try {
      const body = await req.clone().json() as Partial<Payload>;
      if (body.id) {
        await save(store, { id: body.id, status: "failed", error: error instanceof Error ? error.message : "Внутренняя ошибка фоновой генерации.", updatedAt: "" });
      }
    } catch {
      // The background invocation is acknowledged already; keep secrets and payloads out of logs.
    }
  }
};

export const config: Config = {
  background: true,
  path: "/generate-background",
  method: "POST"
};
