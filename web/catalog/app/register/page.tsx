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
    <div style={{minHeight:'70vh', display:'grid', placeItems:'center'}}>
      <div className="card" style={{minWidth:320, maxWidth:520, width:'100%'}}>
        <div className="cardBody">
          <h1 className="h1" style={{textAlign:'center', marginBottom:6}}>Регистрация</h1>
          <p className="p" style={{textAlign:'center', marginBottom:12}}>Создайте аккаунт, чтобы управлять кастингами</p>
          <form onSubmit={onSubmit} className="grid1">
            <input className="input" name="email" placeholder="Email" type="email" required />
            <input className="input" name="password" placeholder="Пароль" type="password" required />
            <input className="input" name="company" placeholder="Компания" required />
            <input className="input" name="role" placeholder="Должность (опционально)" />
            {error && <div className="p" style={{color:'#ff6b6b'}}>{error}</div>}
            <button className="btn" disabled={loading}>{loading?"Загрузка...":"Создать"}</button>
            <a className="btn btn--ghost" href={bp('/login')}>У меня уже есть аккаунт</a>
          </form>
        </div>
      </div>
    </div>
  );
}
