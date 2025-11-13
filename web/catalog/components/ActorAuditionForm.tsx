// web/catalog/components/ActorAuditionForm.tsx
"use client";
import React from "react";
import { api } from "../lib/http";

export default function ActorAuditionForm({ castingId }: { castingId: number }) {
  const [file, setFile] = React.useState<File | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [msg, setMsg] = React.useState("");
  const [dragOver, setDragOver] = React.useState(false);

  async function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (!file || saving) return;
    setSaving(true); setMsg("");
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch(api(`/api/castings/${castingId}/auditions`), { method:'POST', body: fd });
      const d = await r.json();
      if (r.ok && d.ok) {
        setMsg('Видео‑проба отправлена');
        setFile(null);
      } else {
        setMsg(d.error || 'Ошибка');
      }
    } catch { setMsg('Ошибка сети'); }
    finally { setSaving(false); }
  }

  function onDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault(); e.stopPropagation(); setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }

  return (
    <form onSubmit={onSend} className="grid1">
      <div
        className="dropzone"
        onDragOver={(e)=>{e.preventDefault(); setDragOver(true);}}
        onDragLeave={()=>setDragOver(false)}
        onDrop={onDrop}
        style={{ borderColor: dragOver ? 'var(--accent)' : undefined, boxShadow: dragOver ? '0 0 0 2px var(--accent) inset' : undefined }}
      >
        <div>
          <div className="dzIcon">⇧</div>
          <div className="p" style={{textAlign:'center'}}>Перетащите видео сюда или выберите файл</div>
        </div>
        <input id={`audition-file-${castingId}`} type="file" accept="video/*" style={{display:'none'}} onChange={(e)=> setFile(e.target.files?.[0] || null)} />
      </div>
      <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
        <label className="btn btn--secondary" htmlFor={`audition-file-${castingId}`}>Выбрать файл</label>
        <div className="p" style={{opacity:.85}}>{file ? file.name : 'Файл не выбран'}</div>
      </div>
      <div className="row end">
        {msg && <span className="p" style={{color: msg.includes('Ошибка') ? '#c24141' : '#10a37f', marginRight:'auto'}}>{msg}</span>}
        <button className="btn" type="submit" disabled={!file || saving}>{saving? 'Отправка…' : 'Отправить пробу'}</button>
      </div>
      <div className="p" style={{color:'#6b7280'}}>Поддерживаются видео‑файлы. Убедитесь, что ролик хорошо виден и слышен.</div>
    </form>
  );
}
