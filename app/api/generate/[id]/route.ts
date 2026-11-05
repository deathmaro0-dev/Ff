import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "../../../../../lib/auth";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Сначала войди в личную студию." }, { status: 401 });
  }
  const apiKey = process.env.POLZA_API_KEY;
  if (!apiKey) return NextResponse.json({ error: "Polza.ai не подключён." }, { status: 503 });

  const { id } = await context.params;
  if (!/^aig_[A-Za-z0-9_-]+$/.test(id)) {
    return NextResponse.json({ error: "Некорректный ID генерации." }, { status: 400 });
  }

  try {
    const response = await fetch(`https://polza.ai/api/v1/media/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(20000),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return NextResponse.json({ error: data.error || "Не удалось получить статус." }, { status: response.status >= 500 ? 502 : response.status });
    }
    return NextResponse.json({
      id: data.id,
      status: data.status,
      resultUrl: data.status === "completed" ? data.data?.url : undefined,
      error: data.status === "failed" ? data.error : undefined,
      usage: data.usage,
    });
  } catch {
    return NextResponse.json({ error: "Не удалось проверить статус генерации." }, { status: 502 });
  }
}
