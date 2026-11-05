import { getStore } from "@netlify/blobs";
import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Job = {
  id: string;
  status: "queued" | "pending" | "processing" | "completed" | "failed";
  resultUrl?: string;
  error?: string;
  model?: string;
  updatedAt?: string;
};

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: "Сначала войди в личную студию." }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id || !/^[a-f0-9-]{36}$/i.test(id)) {
    return NextResponse.json({ error: "Некорректный ID генерации." }, { status: 400 });
  }

  try {
    const store = getStore("nova-studio-generation-jobs");
    const job = await store.get(id, { type: "json" }) as Job | null;
    if (!job) return NextResponse.json({ error: "Задача пока не появилась в очереди. Повтори проверку через несколько секунд.", status: "queued" }, { status: 202 });
    return NextResponse.json(job, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Не удалось прочитать состояние генерации." }, { status: 503 });
  }
}
