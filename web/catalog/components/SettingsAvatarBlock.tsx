"use client";
import React from "react";
import { api, bp } from "../lib/http";

export default function SettingsAvatarBlock() {
  const [url, setUrl] = React.useState<string | null>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);
  React.useEffect(() => {
    (async () => {
      try {
        const r = await fetch(api('/api/settings/avatar'));
        const d = await r.json();
        if (d.ok) setUrl(d.url || null);
      } catch {}
    })();
  }, []);
  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || loading) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const r = await fetch(api('/api/settings/avatar'), { method: 'POST', body: fd });
      const d = await r.json();
      if (r.ok && d.ok) setUrl(d.url);
    } finally { setLoading(false); }
  }
  async function onDelete() {
    if (!url) return;
    if (!confirm('Удалить аватар?')) return;
    const r = await fetch(api('/api/settings/avatar'), { method: 'DELETE' });
    const d = await r.json();
    if (r.ok && d.ok) setUrl(null);
  }
  return (
    <div className="grid" style={{gridTemplateColumns:'140px 1fr', gap:12, alignItems:'center'}}>
      <div>
        <div style={{width:120, height:120, borderRadius:12, overflow:'hidden', border:'1px solid var(--border)'}}>
          {url ? (
            <img src={bp(url)} alt="Аватар" style={{width:'100%', height:'100%', objectFit:'cover'}} />
          ) : (
            <div className="p" style={{display:'grid', placeItems:'center', width:'100%', height:'100%', color:'#6b7280'}}>Нет фото</div>
          )}
        </div>
      </div>
      <form onSubmit={onUpload} className="row" style={{gap:8, alignItems:'center', flexWrap:'wrap'}}>
        <input id="avatarFile" type="file" accept="image/*" style={{display:'none'}} onChange={(e)=>setFile(e.target.files?.[0] || null)} />
        <label htmlFor="avatarFile" className="btn btn--secondary">Выбрать файл</label>
        <button className="btn" type="submit" disabled={!file || loading}>{loading? 'Загрузка…' : 'Загрузить'}</button>
        <button className="btn btn--danger" type="button" onClick={onDelete} disabled={!url}>Удалить</button>
        <span className="p" style={{opacity:.8, minWidth:220}}>{file ? file.name : (url ? 'Файл загружен' : 'Файл не выбран')}</span>
      </form>
    </div>
  );
}
