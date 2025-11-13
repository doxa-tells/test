"use client";
import React from "react";
import { api, bp } from "../lib/http";

export default function SettingsAvatarBlock() {
  const [url, setUrl] = React.useState<string | null>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
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
  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }
  return (
    <div className="grid" style={{gridTemplateColumns:'180px 1fr', gap:16, alignItems:'stretch'}}>
      {/* Превью */}
      <div className="card" style={{padding:0, overflow:'hidden'}}>
        <div style={{aspectRatio:'1 / 1', width:'100%', maxWidth:220, margin:'0 auto', display:'grid', placeItems:'center', background:'linear-gradient(180deg, #111315, #0b0c0f)', borderBottom:'1px solid var(--border)'}}>
          <div style={{width:160, height:160, borderRadius:'50%', overflow:'hidden', border:'1px solid var(--border)'}}>
            {url ? (
              <img src={bp(url)} alt="Аватар" style={{width:'100%', height:'100%', objectFit:'cover'}} />
            ) : (
              <div className="p" style={{display:'grid', placeItems:'center', width:'100%', height:'100%', color:'#6b7280'}}>Нет фото</div>
            )}
          </div>
        </div>
        <div className="cardBody" style={{padding:12}}>
          <div className="row" style={{gap:8, justifyContent:'center'}}>
            <button className="btn btn--danger" type="button" onClick={onDelete} disabled={!url}>Удалить</button>
          </div>
        </div>
      </div>

      {/* Загрузка */}
      <form onSubmit={onUpload} className="card" style={{padding:0, overflow:'hidden'}}>
        <div
          onDragOver={(e)=>{e.preventDefault(); setDragOver(true);}}
          onDragLeave={()=>setDragOver(false)}
          onDrop={onDrop}
          style={{
            padding:16,
            border: dragOver ? '1px dashed var(--accent)' : '1px dashed var(--border)',
            borderRadius:12,
            margin:12,
            background: dragOver ? 'rgba(16,163,127,0.08)' : 'transparent',
            textAlign:'center',
            transition:'all .15s ease-in-out'
          }}
        >
          <input id="avatarFile" type="file" accept="image/*" style={{display:'none'}} onChange={(e)=>setFile(e.target.files?.[0] || null)} />
          <label htmlFor="avatarFile" className="btn btn--secondary" style={{marginBottom:8}}>📁 Выбрать файл</label>
          <div className="p" style={{color:'#9aa0a6'}}>или перетащите изображение сюда</div>
          <div className="p" style={{opacity:.9, marginTop:8}}>{file ? file.name : (url ? 'Файл загружен' : 'Файл не выбран')}</div>
        </div>
        <div className="cardBody" style={{padding:12}}>
          <div className="row" style={{gap:8, justifyContent:'flex-end'}}>
            <button className="btn" type="submit" disabled={!file || loading}>{loading? 'Загрузка…' : 'Загрузить'}</button>
          </div>
          <div className="p" style={{color:'#6b7280', marginTop:8}}>Рекомендуемый размер 512×512, формат JPG/PNG/WebP.</div>
        </div>
      </form>
    </div>
  );
}
