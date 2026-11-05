"use client";
import { useState } from "react";

type Mode = "image" | "video";
export default function Admin() {
  const [tab, setTab] = useState<Mode>("image");
  const [prompt, setPrompt] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [status, setStatus] = useState("");
  const [resultUrl, setResultUrl] = useState("");
  const [model, setModel] = useState("seedream");
  const [duration, setDuration] = useState("5");
  const [busy, setBusy] = useState(false);

  function switchTab(next: Mode) {
    setTab(next);
    setModel(next === "image" ? "seedream" : "seedance");
    setStatus("");
    setResultUrl("");
  }

  function pick(f: File | null) {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  async function generate() {
    if (!prompt.trim() || busy) return;
    setBusy(true);
    setResultUrl("");
    setStatus("Отправляю запрос в Polza.ai…");
    try {
      const fd = new FormData();
      fd.append("type", tab);
      fd.append("prompt", prompt);
      fd.append("model", model);
      fd.append("duration", duration);
      if (file) fd.append("reference", file);

      const res = await fetch("/api/generate", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Не удалось запустить генерацию.");

      setStatus("Запрос принят. Генерация выполняется…");
      const interval = tab === "image" ? 4000 : 8000;
      const deadline = Date.now() + 8 * 60 * 1000;

      while (Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, interval));
        const check = await fetch(`/api/generate/${encodeURIComponent(data.id)}`, { cache: "no-store" });
        const state = await check.json();
        if (!check.ok) throw new Error(state.error || "Не удалось проверить генерацию.");
        if (state.status === "completed" && state.resultUrl) {
          setResultUrl(state.resultUrl);
          setStatus("Готово. Результат хранится на CDN Polza.ai ограниченное время.");
          return;
        }
        if (state.status === "failed") throw new Error(state.error || "Модель не смогла выполнить генерацию.");
        setStatus(state.status === "pending" ? "В очереди Polza.ai…" : "Генерация выполняется…");
      }
      setStatus(`Генерация ещё выполняется. ID: ${data.id}. Обнови страницу позже или проверь статус.`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Ошибка генерации.");
    } finally {
      setBusy(false);
    }
  }

  const imageModels = [{ value: "seedream", label: "Seedream 4.5 — фото" }];
  const videoModels = [
    { value: "seedance", label: "Seedance 2 — видео" },
    { value: "seedance_fast", label: "Seedance 2 Fast — быстрее" },
    { value: "veo", label: "Veo 3.1 — качество" },
    { value: "veo_fast", label: "Veo 3.1 Fast" },
  ];

  return <main className="shell">
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
        <div className="sideitem">◉ Референсы НОВЫ</div>
        <div className="sideitem">⚙ Настройки</div>
        <div className="sideitem">◉ Личный режим</div>
      </aside>
      <section className="panel">
        <div className="panelhead">
          <div><div className="eyebrow">CREATION WORKSPACE</div><h2>Новая генерация</h2></div>
          <span className="status">● Личный режим</span>
        </div>
        <div className="notice"><b>Личная студия НОВЫ.</b> Доступ только для владельца. Генерации оплачиваются с твоего баланса Polza.ai. Студия не принимает платежи от других пользователей.</div>
        <div className="actions" style={{ marginTop: 0, marginBottom: 20 }}>
          <button className={"btn " + (tab === "image" ? "primary" : "")} onClick={() => switchTab("image")}>✧ Фото</button>
          <button className={"btn " + (tab === "video" ? "primary" : "")} onClick={() => switchTab("video")}>▶ Видео</button>
        </div>
        <div className="formgrid">
          <div className="field full"><label>ОПИСАНИЕ СЦЕНЫ</label>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder={tab === "image" ? "Например: НОВА на летней террасе, editorial fashion, мягкий солнечный свет…" : "Например: лёгкий поворот головы, ветер шевелит волосы, плавное движение камеры…"}/>
          </div>
          <div className="field"><label>МОДЕЛЬ</label>
            <select value={model} onChange={e => setModel(e.target.value)}>
              {(tab === "image" ? imageModels : videoModels).map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
          {tab === "video" && <div className="field"><label>ДЛИТЕЛЬНОСТЬ</label>
            <select value={duration} onChange={e => setDuration(e.target.value)}>
              <option value="5">5 секунд</option><option value="8">8 секунд</option><option value="10">10 секунд</option><option value="15">15 секунд</option>
            </select>
          </div>}
          <div className="field full"><label>РЕФЕРЕНС НОВЫ</label>
            <label className="drop">＋ Загрузить эталонное фото
              <input type="file" accept="image/*" onChange={e => pick(e.target.files?.[0] || null)}/>
              {file && <span className="small">{file.name}</span>}
              {preview && <img className="preview" src={preview} alt="Reference preview"/>}
            </label>
          </div>
          <div className="field full">
            <button className="btn primary" onClick={generate} disabled={busy}>{busy ? "Генерирую…" : "Создать для НОВЫ ↗"}</button>
            {status && <div className="small" role="status">{status}</div>}
            {resultUrl && <a className="btn" href={resultUrl} target="_blank" rel="noreferrer">Открыть результат ↗</a>}
          </div>
        </div>
      </section>
    </div>
  </main>;
}
