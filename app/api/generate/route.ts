import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "../../../lib/auth";

export const runtime = "nodejs";

const MODELS: Record<string, { id: string; type: "image" | "video" }> = {
  seedream: { id: "bytedance/seedream-4.5", type: "image" },
  seedance: { id: "bytedance/seedance-2", type: "video" },
  seedance_fast: { id: "bytedance/seedance-2-fast", type: "video" },
  veo: { id: "google/veo3", type: "video" },
  veo_fast: { id: "google/veo3_fast", type: "video" }
};

function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) return fail("Сначала войди в личную студию.", 401);

  if (!process.env.POLZA_API_KEY) {
    return fail("Polza.ai не подключён: проверь защищённую переменную POLZA_API_KEY в Netlify.", 503);
  }

  try {
    const form = await req.formData();
    const prompt = String(form.get("prompt") || "").trim();
    const type = String(form.get("type") || "image");
    const modelKey = String(form.get("model") || "seedream");
    const duration = Math.min(15, Math.max(5, Number(form.get("duration") || 5)));
    const model = MODELS[modelKey];

    if (!prompt) return fail("Напиши описание сцены.");
    if (!model || model.type !== type) return fail("Выбрана неподходящая модель для этого режима.");
    if (prompt.length > (type === "image" ? 3000 : 12000)) return fail("Слишком длинное описание сцены.");

    const input: Record<string, unknown> = { prompt, aspect_ratio: "9:16" };

    if (type === "video") {
      input.duration = duration;
      input.resolution = "720p";
    }

    const reference = form.get("reference");
    if (reference instanceof File && reference.size > 0) {
      if (!reference.type.startsWith("image/")) return fail("Референс должен быть изображением.");
      if (reference.size > 190 * 1024) return fail("Референс слишком большой. Выбери фото поменьше.");
      const bytes = Buffer.from(await reference.arrayBuffer());
      input.images = [{ type: "base64", data: `data:${reference.type};base64,${bytes.toString("base64")}` }];
    }

    const id = randomUUID();
    const payload = { id, type, model: model.id, input };
    const cookie = req.headers.get("cookie") || "";

    // Netlify Background Function acknowledges immediately and runs the paid request separately.
    const trigger = await fetch(new URL("/generate-background", req.url), {
      method: "POST",
      headers: { "Content-Type": "application/json", Cookie: cookie },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
      cache: "no-store"
    });

    if (trigger.status !== 202 && !trigger.ok) {
      const detail = await trigger.text().catch(() => "");
      return fail(`Netlify не принял фоновую задачу (${trigger.status}). ${detail.slice(0, 180)}`, 502);
    }

    return NextResponse.json({ id, status: "queued" }, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось создать задачу.";
    return fail(message, 502);
  }
}
