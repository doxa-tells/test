// web/catalog/app/login/page.tsx
"use client";
import { useState } from "react";
import { api, bp } from "../../lib/http";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError(null);
    const form = new FormData(e.currentTarget);
    const res = await fetch(api("/api/auth/login"), { method: "POST", body: form });
    const data = await res.json();
    setLoading(false);
    if (!data.ok) { setError(data.error || "Ошибка"); return; }
    location.href = bp("/my-castings");
  }

  return (
    <div style={{minHeight:'70vh', display:'grid', placeItems:'center'}}>
      <div className="card" style={{minWidth:320, maxWidth:480}}>
        <div className="cardBody">
          <h1 className="h1" style={{marginBottom:6}}>Войти</h1>
          <p className="p" style={{marginBottom:12}}>Доступ к управлению кастингами и лентой</p>
          <form onSubmit={onSubmit} className="grid1">
            <input className="input" name="email" placeholder="Email" type="email" required />
            <input className="input" name="password" placeholder="Пароль" type="password" required />
            {error && <div className="p" style={{color:'#ff6b6b'}}>{error}</div>}
            <button className="btn" disabled={loading}>{loading?"Загрузка...":"Войти"}</button>
            <a className="btn btn--ghost" href={bp('/register')}>Создать аккаунт</a>
          </form>
        </div>
      </div>
    </div>
  );
}
