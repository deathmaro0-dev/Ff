import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "../../../lib/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

const MODELS: Record<string, { id: string; type: "image" | "video" }> = {
  seedream: { id: "bytedance/seedream-4.5", type: "image" },
  seedance: { id: "bytedance/seedance-2", type: "video" },
  seedance_fast: { id: "bytedance/seedance-2-fast", type: "video" },
  veo: { id: "google/veo3", type: "video" },
  veo_fast: { id: "google/veo3_fast", type: "video" },
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(req: NextRequest) {
  if (!(await isAuthenticated())) return jsonError("Сначала войди в личную студию.", 401);

  const apiKey = process.env.POLZA_API_KEY;
  if (!apiKey) return jsonError("Polza.ai не подключён: добавь POLZA_API_KEY в защищённые переменные Netlify.", 503);

  try {
    const form = await req.formData();
    const prompt = String(form.get("prompt") || "").trim();
    const type = String(form.get("type") || "image");
    const modelKey = String(form.get("model") || "seedream");
    const duration = Math.min(15, Math.max(5, Number(form.get("duration") || 5)));
    const model = MODELS[modelKey];

    if (!prompt) return jsonError("Напиши описание сцены.");
    if (!model || model.type !== type) return jsonError("Выбрана неподходящая модель для этого режима.");
    if (prompt.length > (type === "image" ? 3000 : 20000)) return jsonError("Слишком длинное описание сцены.");

    const input: Record<string, unknown> = {
      prompt,
      aspect_ratio: "9:16",
    };

    if (type === "image") input.quality = "basic";
    if (type === "video" && modelKey.startsWith("seedance")) {
      input.duration = String(duration);
      input.resolution = "720p";
      input.generate_audio = "false";
      input.multi_shots = "false";
    }

    const reference = form.get("reference");
    if (reference instanceof File && reference.size > 0) {
      if (!reference.type.startsWith("image/")) return jsonError("Референс должен быть изображением.");
      if (reference.size > 10 * 1024 * 1024) return jsonError("Изображение-референс должно быть меньше 10 МБ.");
      const bytes = Buffer.from(await reference.arrayBuffer());
      const dataUri = `data:${reference.type};base64,${bytes.toString("base64")}`;
      input.images = [{ type: "base64", data: dataUri }];
    }

    const response = await fetch("https://polza.ai/api/v1/media", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ model: model.id, input, async: true }),
      signal: AbortSignal.timeout(55000),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detail = typeof data.error === "string" ? data.error : "Polza.ai не принял запрос.";
      return jsonError(detail, response.status >= 500 ? 502 : response.status);
    }
    if (!data.id) return jsonError("Polza.ai не вернул ID генерации.", 502);

    return NextResponse.json({ id: data.id, status: data.status || "pending", model: model.id });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Не удалось отправить запрос.";
    return jsonError(message, 502);
  }
}
