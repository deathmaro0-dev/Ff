"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Не удалось войти");
      window.location.href = "/admin";
    } catch (error) {
      setError(error instanceof Error ? error.message : "Ошибка входа");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <section className="panel" style={{ width: "min(460px,100%)" }}>
        <div className="brand"><div className="brandmark">N</div><span>NOVA STUDIO</span></div>
        <div className="eyebrow" style={{ marginTop: 32 }}>PRIVATE CREATOR SPACE</div>
        <h2 style={{ marginTop: 10 }}>Вход в личную студию</h2>
        <p className="sub">Закрытое рабочее пространство для создания фото и видео NOVA.</p>
        <form onSubmit={submit} className="formgrid">
          <div className="field full">
            <label htmlFor="password">ПАРОЛЬ ВЛАДЕЛЬЦА</label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required placeholder="Пароль владельца" />
          </div>
          <div className="field full">
            <button className="btn primary" disabled={busy}>{busy ? "Входим…" : "Войти в студию ↗"}</button>
            {error && <div className="small error" role="alert">{error}</div>}
          </div>
        </form>
      </section>
    </main>
  );
}
