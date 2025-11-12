// web/catalog/app/register/page.tsx
"use client";
import { useState } from "react";
import { api, bp } from "../../lib/http";

export default function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch(api("/api/auth/register"), { method: "POST", body: form });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) { setError(data.error || "Ошибка"); return; }
    location.href = bp("/my-castings");
  }

  return (
    <div>
      <h1 className="h1">Регистрация</h1>
      <form onSubmit={onSubmit} className="grid" style={{maxWidth:560}}>
        <input className="input" name="email" placeholder="Email" type="email" required />
        <input className="input" name="password" placeholder="Пароль" type="password" required />
        <input className="input" name="company" placeholder="Компания" required />
        <input className="input" name="role" placeholder="Должность (опционально)" />
        {error && <div className="p" style={{color:'#ff6b6b'}}>{error}</div>}
        <button className="btn" disabled={loading}>{loading?"Загрузка...":"Создать"}</button>
        <a className="muted" href={bp('/login')}>У меня уже есть аккаунт</a>
      </form>
    </div>
  );
}
