// web/catalog/app/settings/page.tsx
"use client";
import { useEffect, useState } from "react";

type Prefs = {
  sex?: string | null;
  city?: string | null;
  look_type?: string | null;
  body_type?: string | null;
  hair_color?: string | null;
  eye_color?: string | null;
  lang?: string | null;
  height_min?: number | null;
  height_max?: number | null;
  age_from?: number | null;
  age_to?: number | null;
};

export default function SettingsPage() {
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const r = await fetch('/api/prefs');
      if (r.status === 401) { location.href = '/login'; return; }
      const d = await r.json();
      if (d.ok) setPrefs(d.prefs || {});
      setLoading(false);
    }
    load();
  }, []);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true); setMsg(null);
    const fd = new FormData(e.currentTarget);
    const r = await fetch('/api/prefs', { method:'POST', body: fd });
    const d = await r.json();
    setSaving(false);
    if (!d.ok) { setMsg(d.error || 'Ошибка'); return; }
    setMsg('Сохранено');
  }

  async function logout() {
    const r = await fetch('/api/auth/logout', { method:'POST' });
    if (r.ok) location.href = '/';
  }

  if (loading) return <div className="p">Загрузка…</div>;

  return (
    <div>
      <div className="row space">
        <h1 className="h1">Настройки</h1>
        <button className="btn btn--ghost" onClick={logout}>Выйти</button>
      </div>
      <hr className="hr" />

      <div className="card" style={{maxWidth:780}}>
        <div className="cardBody">
          <div className="sectionTitle">Предпочтения для подбора актёров</div>
          <form onSubmit={onSubmit} className="grid" style={{gridTemplateColumns:'repeat(3, minmax(0,1fr))'}}>
            <select name="sex" className="select" defaultValue={prefs?.sex ?? ''}>
              <option value="">Пол</option>
              <option>Мужской</option>
              <option>Женский</option>
            </select>
            <input className="input" name="city" placeholder="Город" defaultValue={prefs?.city ?? ''} />
            <input className="input" name="look_type" placeholder="Типаж" defaultValue={prefs?.look_type ?? ''} />

            <input className="input" name="body_type" placeholder="Телосложение" defaultValue={prefs?.body_type ?? ''} />
            <input className="input" name="hair_color" placeholder="Цвет волос" defaultValue={prefs?.hair_color ?? ''} />
            <input className="input" name="eye_color" placeholder="Цвет глаз" defaultValue={prefs?.eye_color ?? ''} />

            <input className="input" name="lang" placeholder="Язык" defaultValue={prefs?.lang ?? ''} />
            <input className="input" type="number" name="height_min" placeholder="Рост от" defaultValue={prefs?.height_min ?? ''} />
            <input className="input" type="number" name="height_max" placeholder="Рост до" defaultValue={prefs?.height_max ?? ''} />

            <input className="input" type="number" name="age_from" placeholder="Возраст от" defaultValue={prefs?.age_from ?? ''} />
            <input className="input" type="number" name="age_to" placeholder="Возраст до" defaultValue={prefs?.age_to ?? ''} />

            {msg && <div className="p" style={{color: msg==='Сохранено' ? '#10a37f' : '#ff6b6b'}}>{msg}</div>}
            <div className="row end" style={{gridColumn:'1 / -1'}}>
              <button className="btn" disabled={saving}>{saving? 'Сохранение…' : 'Сохранить'}</button>
            </div>
          </form>
        </div>
      </div>

      <div className="section">
        <div className="sectionTitle">Совет</div>
        <p className="p">После сохранения зайдите в раздел <a href="/favorites">Моя подборка</a>, мы подберём актёров по этим настройкам.</p>
      </div>
    </div>
  );
}
