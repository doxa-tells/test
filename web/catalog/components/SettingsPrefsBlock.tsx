// web/catalog/components/SettingsPrefsBlock.tsx
"use client";
import React from "react";
import { api } from "../lib/http";

export default function SettingsPrefsBlock() {
  const [form, setForm] = React.useState({
    sex:"", city:"", look_type:"", body_type:"", hair_color:"", eye_color:"", lang:"",
    height_min:"", height_max:"", age_from:"", age_to:""
  });
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState("");

  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch(api('/api/settings/prefs'));
        const d = await r.json();
        if (d.ok && d.prefs) {
          const p = d.prefs;
          setForm({
            sex: p.sex || "", city: p.city || "", look_type: p.look_type || "", body_type: p.body_type || "",
            hair_color: p.hair_color || "", eye_color: p.eye_color || "", lang: p.lang || "",
            height_min: p.height_min?.toString() || "", height_max: p.height_max?.toString() || "",
            age_from: p.age_from?.toString() || "", age_to: p.age_to?.toString() || "",
          });
        }
      } finally { setLoading(false); }
    })();
  }, []);

  function upd<K extends keyof typeof form>(k: K, v: string) { setForm(prev=>({ ...prev, [k]: v })); }

  async function onSave(e: React.FormEvent) {
    e.preventDefault(); if (saving) return;
    setSaving(true); setMsg("");
    try {
      const r = await fetch(api('/api/settings/prefs'), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(form) });
      const d = await r.json();
      setMsg(r.ok && d.ok ? 'Сохранено' : (d.error || 'Ошибка'));
    } catch { setMsg('Ошибка сети'); }
    finally { setSaving(false); }
  }

  return (
    <div className="card" style={{marginTop:12}}>
      <div className="cardBody">
        <div className="h2" style={{marginBottom:8}}>Предпочтения подбора</div>
        {loading ? (
          <p className="p">Загрузка…</p>
        ) : (
          <form onSubmit={onSave} className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:12}}>
            <div className="grid" style={{gridTemplateColumns:'1fr', gap:8}}>
              <input className="input" placeholder="Пол (Мужской/Женский)" value={form.sex} onChange={e=>upd('sex', e.target.value)} />
              <input className="input" placeholder="Город" value={form.city} onChange={e=>upd('city', e.target.value)} />
              <input className="input" placeholder="Типаж" value={form.look_type} onChange={e=>upd('look_type', e.target.value)} />
              <input className="input" placeholder="Телосложение" value={form.body_type} onChange={e=>upd('body_type', e.target.value)} />
              <input className="input" placeholder="Цвет волос" value={form.hair_color} onChange={e=>upd('hair_color', e.target.value)} />
              <input className="input" placeholder="Цвет глаз" value={form.eye_color} onChange={e=>upd('eye_color', e.target.value)} />
            </div>
            <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:8}}>
              <input className="input" placeholder="Язык (напр. Русский)" value={form.lang} onChange={e=>upd('lang', e.target.value)} />
              <div />
              <input className="input" placeholder="Рост от" value={form.height_min} onChange={e=>upd('height_min', e.target.value)} />
              <input className="input" placeholder="Рост до" value={form.height_max} onChange={e=>upd('height_max', e.target.value)} />
              <input className="input" placeholder="Возраст от" value={form.age_from} onChange={e=>upd('age_from', e.target.value)} />
              <input className="input" placeholder="Возраст до" value={form.age_to} onChange={e=>upd('age_to', e.target.value)} />
            </div>
            <div className="row" style={{gridColumn:'1 / -1', justifyContent:'flex-end', gap:8}}>
              <button className="btn" type="submit" disabled={saving}>{saving? 'Сохранение…' : 'Сохранить'}</button>
              {msg && <span className="p" style={{opacity:.8}}>{msg}</span>}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
