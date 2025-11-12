"use client";
import { useEffect, useState } from "react";
import { api, bp } from "../../../lib/http";

export default function PublicCastingDetailPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const [item, setItem] = useState<any>(null);
  const [files, setFiles] = useState<any[]>([]);
  const [file, setFile] = useState<File|null>(null);
  const [msg, setMsg] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(api(`/api/public/castings/${id}`));
        const d = await r.json();
        if (d.ok) { setItem(d.item); setFiles(d.files || []); }
      } finally { setLoading(false); }
    })();
  }, [id]);

  async function onUpload(e: React.FormEvent) {
    e.preventDefault();
    if (!file || uploading) return;
    setUploading(true);
    setMsg("");
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch(api(`/api/castings/${id}/auditions`), { method:'POST', body: fd });
      if (r.status === 401) { location.href = bp('/login'); return; }
      const d = await r.json();
      if (r.ok && d.ok) {
        setMsg('Видео‑проба загружена');
        setFile(null);
      } else {
        setMsg(d.error || 'Ошибка');
      }
    } catch { setMsg('Ошибка сети'); }
    finally { setUploading(false); }
  }

  return (
    <div style={{maxWidth:900, margin:'0 auto'}}>
      {loading ? (
        <p className="p">Загрузка…</p>
      ) : !item ? (
        <p className="p">Кастинг не найден</p>
      ) : (
        <>
          <h1 className="h1">{item.title}</h1>
          {item.description && <p className="p">{item.description}</p>}
          {files.length > 0 && (
            <div className="section">
              <div className="p" style={{fontWeight:600}}>Файлы кастинга</div>
              <div className="dzFiles">
                {files.map((f:any)=> (
                  <div key={f.id} className="dzFile"><a href={bp(f.url)} target="_blank" rel="noreferrer">{f.filename}</a></div>
                ))}
              </div>
            </div>
          )}

          <hr className="hr" />
          <div className="section">
            <div className="h2">Отправить видео‑пробу</div>
            <form onSubmit={onUpload} className="row" style={{alignItems:'center', gap:12}}>
              <input type="file" accept="video/*" onChange={(e)=>setFile(e.target.files?.[0] || null)} />
              <button className="btn" type="submit" disabled={!file || uploading}>{uploading? 'Загрузка…' : 'Отправить'}</button>
              {msg && <span className="p">{msg}</span>}
            </form>
            <div className="p" style={{color:'#777'}}>Для загрузки требуется авторизация и привязанный актёрский ID (см. Настройки → Привязка актёра).</div>
          </div>

          <div className="row" style={{marginTop:12}}>
            <a className="btn btn--ghost" href={bp('/castings')}>← К списку кастингов</a>
          </div>
        </>
      )}
    </div>
  );
}
