// web/catalog/components/SettingsCompanyBlock.tsx
"use client";
import React from "react";
import { api } from "../lib/http";

export default function SettingsCompanyBlock() {
  const [name, setName] = React.useState("");
  const [role, setRole] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState<string>("");

  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch(api('/api/settings/company'));
        const d = await r.json();
        if (d.ok && d.company) {
          setName(d.company.name || "");
          setRole(d.company.role || "");
          setBio(d.company.bio || "");
        }
      } finally { setLoading(false); }
    })();
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true); setMsg("");
    try {
      const r = await fetch(api('/api/settings/company'), { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ name: name.trim(), role: role.trim() || null, bio: bio.trim() || null }) });
      const d = await r.json();
      if (r.ok && d.ok) {
        setMsg('Сохранено');
        if (d.company) {
          setName(d.company.name || '');
          setRole(d.company.role || '');
          setBio(d.company.bio || '');
        }
      } else setMsg(d.error || 'Ошибка');
    } catch { setMsg('Ошибка сети'); }
    finally { setSaving(false); }
  }

  return (
    <div className="card" style={{marginTop:12}}>
      <div className="cardBody">
        <div className="h2" style={{marginBottom:8}}>Компания</div>
        {loading ? (
          <p className="p">Загрузка…</p>
        ) : (
          <form onSubmit={onSave} className="grid" style={{gridTemplateColumns:'1fr 2fr', gap:12, alignItems:'center'}}>
            <label className="p" htmlFor="companyName" style={{color:'#6b7280'}}>Название</label>
            <input id="companyName" className="input" value={name} onChange={e=>setName(e.target.value)} placeholder="Например, KinoStudio" required />

            <label className="p" htmlFor="companyRole" style={{color:'#6b7280'}}>Роль</label>
            <input id="companyRole" className="input" value={role} onChange={e=>setRole(e.target.value)} placeholder="Кастинг‑директор / Агент / Продюсер" />

            <label className="p" htmlFor="companyBio" style={{color:'#6b7280'}}>Краткое описание</label>
            <textarea id="companyBio" className="input" value={bio} onChange={e=>setBio(e.target.value)} placeholder="Коротко о вас и ваших проектах" style={{minHeight:96}} />

            <div />
            <div className="row" style={{gap:8, alignItems:'center'}}>
              <button className="btn" type="submit" disabled={saving || !name.trim()}>{saving? 'Сохранение…' : 'Сохранить'}</button>
              {msg && <span className="p" style={{opacity:.8}}>{msg}</span>}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
