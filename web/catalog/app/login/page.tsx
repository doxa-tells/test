// web/catalog/app/login/page.tsx
"use client";
import { useState } from "react";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch("/api/auth/login", { method: "POST", body: form });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) { setError(data.error || "Ошибка"); return; }
    location.href = "/my-castings";
  }

  return (
    <div>
      <h1 className="h1">Войти</h1>
      <form onSubmit={onSubmit} className="grid" style={{maxWidth:480}}>
        <input className="input" name="email" placeholder="Email" type="email" required />
        <input className="input" name="password" placeholder="Пароль" type="password" required />
        {error && <div className="p" style={{color:'#ff6b6b'}}>{error}</div>}
        <button className="btn" disabled={loading}>{loading?"Загрузка...":"Войти"}</button>
        <a className="muted" href="/register">Создать аккаунт</a>
      </form>
    </div>
  );
}
