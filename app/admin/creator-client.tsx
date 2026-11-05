"use client";

import { useEffect, useState } from "react";

type Mode = "image" | "video";
type JobStatus = "queued" | "pending" | "processing" | "completed" | "failed";

async function compressReference(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) throw new Error("Референс должен быть изображением.");
  const image = await createImageBitmap(file);
  const scale = Math.min(1, 1400 / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Не удалось обработать изображение.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  image.close();

  let quality = 0.78;
  let blob: Blob | null = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    blob = await new Promise(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
    if (blob && blob.size <= 130 * 1024) break;
    quality -= 0.09;
  }
  if (!blob) throw new Error("Не удалось подготовить референс.");
  if (blob.size > 190 * 1024) throw new Error("Фото слишком большое. Выбери другое изображение.");
  return new File([blob], "nova-reference.jpg", { type: "image/jpeg" });
}

export default function Admin() {
  const [tab, setTab] = useState<Mode>("image");
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [status, setStatus] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [resultType, setResultType] = useState<Mode>("image");
  const [model, setModel] = useState("seedream");
  const [duration, setDuration] = useState("5");
  const [busy, setBusy] = useState(false);
  const [jobId, setJobId] = useState("");

  useEffect(() => {
    return () => { if (preview.startsWith("blob:")) URL.revokeObjectURL(preview); };
  }, [preview]);

  function switchTab(next: Mode) {
    if (busy) return;
    setTab(next);
    setModel(next === "image" ? "seedream" : "seedance");
    setStatus("");
    setResultUrl("");
    setJobId("");
  }

  function pick(next: File | null) {
    if (!next) return;
    if (preview.startsWith("blob:")) URL.revokeObjectURL(preview);
    setFile(next);
    setPreview(URL.createObjectURL(next));
  }

  async function generate() {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setResultUrl("");
    setJobId("");
    setStatus("Подготавливаю запрос…");
    try {
      const fd = new FormData();
      fd.append("type", tab);
      fd.append("prompt", prompt.trim());
      fd.append("model", model);
      fd.append("duration", duration);
      if (file) {
        setStatus("Подготавливаю референс…");
        fd.append("reference", await compressReference(file));
      }

      setStatus("Ставлю задачу в очередь Polza.ai…");
      const response = await fetch("/api/generate", { method: "POST", body: fd });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось запустить генерацию.");

      setJobId(data.id);
      setStatus("Задача принята. Генерация выполняется в фоне…");
      const deadline = Date.now() + 14 * 60 * 1000;

      while (Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, tab === "image" ? 4000 : 8000));
        const check = await fetch(`/api/generate/${encodeURIComponent(data.id)}`, { cache: "no-store" });
        const state = await check.json();
        if (!check.ok) throw new Error(state.error || "Не удалось проверить генерацию.");
        if (state.status === "completed" && state.resultUrl) {
          setResultUrl(state.resultUrl);
          setResultType(tab);
          setStatus("Готово. Polza.ai хранит результат на CDN ограниченное время.");
          return;
        }
        if (state.status === "failed") throw new Error(state.error || "Модель не смогла выполнить генерацию.");
        setStatus(state.status === "queued" || state.status === "pending" ? "В очереди Polza.ai…" : "Генерация выполняется…");
      }
      setStatus(`Задача всё ещё выполняется. ID: ${data.id}. Можно обновить страницу и проверить позже.`);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Ошибка генерации.");
    } finally {
      setBusy(false);
    }
  }

  const imageModels = [{ value: "seedream", label: "Seedream 4.5 — фото" }];
  const videoModels = [
    { value: "seedance", label: "Seedance 2 — видео" },
    { value: "seedance_fast", label: "Seedance 2 Fast — быстрее" },
    { value: "veo", label: "Veo 3.1 — качество" },
    { value: "veo_fast", label: "Veo 3.1 Fast" }
  ];

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/" style={{ textDecoration: "none", color: "white" }}>
          <div className="brandmark">N</div><span>NOVA STUDIO</span>
        </a>
        <form action="/api/auth/logout" method="post"><button className="btn" type="submit">Выйти</button></form>
      </header>

      <div className="admin-layout">
        <aside className="sidebar">
          <div className="sideitem active">✧ Создать</div>
          <div className="sideitem">▧ Галерея</div>
          <div className="sideitem">◉ Референсы NOVA</div>
          <div className="sideitem">⚙ Настройки</div>
          <div className="sideitem">◉ Личный режим</div>
        </aside>

        <section className="panel">
          <div className="panelhead">
            <div><div className="eyebrow">CREATION WORKSPACE</div><h2>Новая генерация</h2></div>
            <span className="status">● Личный режим</span>
          </div>

          <div className="notice"><b>Личная студия NOVA.</b> Доступ только для владельца. Генерации оплачиваются с твоего баланса Polza.ai. Студия не принимает платежи от других пользователей.</div>

          <div className="actions" style={{ marginTop: 0, marginBottom: 20 }}>
            <button className={"btn " + (tab === "image" ? "primary" : "")} onClick={() => switchTab("image")} disabled={busy}>✧ Фото</button>
            <button className={"btn " + (tab === "video" ? "primary" : "")} onClick={() => switchTab("video")} disabled={busy}>▶ Видео</button>
          </div>

          <div className="formgrid">
            <div className="field full">
              <label htmlFor="prompt">ОПИСАНИЕ СЦЕНЫ</label>
              <textarea id="prompt" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={tab === "image" ? "Например: NOVA на осенней улице, editorial fashion, мягкий естественный свет, фотореализм…" : "Например: NOVA слегка поворачивает голову, ветер шевелит волосы, плавное движение камеры…"} />
            </div>

            <div className="field">
              <label htmlFor="model">МОДЕЛЬ</label>
              <select id="model" value={model} onChange={e => setModel(e.target.value)}>
                {(tab === "image" ? imageModels : videoModels).map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
              </select>
            </div>

            {tab === "video" && <div className="field">
              <label htmlFor="duration">ДЛИТЕЛЬНОСТЬ</label>
              <select id="duration" value={duration} onChange={e => setDuration(e.target.value)}>
                <option value="5">5 секунд</option><option value="8">8 секунд</option><option value="10">10 секунд</option><option value="15">15 секунд</option>
              </select>
            </div>}

            <div className="field full">
              <label>РЕФЕРЕНС NOVA</label>
              <label className="drop">
                ＋ Загрузить эталонное фото
                <input type="file" accept="image/*" onChange={e => pick(e.target.files?.[0] || null)} />
                {file && <span className="small">{file.name}</span>}
                {preview && <img className="preview" src={preview} alt="Предпросмотр референса" />}
              </label>
              <span className="small">Изображение автоматически уменьшается перед отправкой. Используй одно чёткое фото лица для сохранения внешности NOVA.</span>
            </div>

            <div className="field full">
              <button className="btn primary" onClick={generate} disabled={busy || !prompt.trim()}>{busy ? "Генерация выполняется…" : "Создать для NOVA ↗"}</button>
              {status && <div className="small" role="status">{status} {jobId && <span> · ID: {jobId}</span>}</div>}
              {resultUrl && <div className="result">
                {resultType === "image" ? <img src={resultUrl} alt="Результат генерации NOVA" /> : <video src={resultUrl} controls playsInline />}
                <div className="result-actions">
                  <a className="btn" href={resultUrl} target="_blank" rel="noreferrer">Открыть оригинал ↗</a>
                  <a className="btn" href={resultUrl} download>Сохранить результат ↓</a>
                </div>
              </div>}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
