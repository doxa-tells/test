"use client";
import React from "react";

export default function SettingsProjectsBlock() {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [role, setRole] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [files, setFiles] = React.useState<File[]>([]);
  const [msg, setMsg] = React.useState<string>('');

  async function load() {
    setLoading(true);
    try {
      const r = await fetch('/catalog/api/settings/projects');
      const d = await r.json();
      if (d.ok) setItems(d.items || []);
    } finally { setLoading(false); }
  }
  React.useEffect(()=>{ load(); }, []);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || saving) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', title.trim());
      if (role.trim()) fd.append('role', role.trim());
      if (description.trim()) fd.append('description', description.trim());
      for (const f of files) fd.append('files', f);
      const r = await fetch('/catalog/api/settings/projects', { method:'POST', body: fd });
      const d = await r.json();
      if (r.ok && d.ok) {
        setTitle(''); setRole(''); setDescription(''); setFiles([]);
        setMsg('Проект добавлен');
        await load();
        setTimeout(()=>setMsg(''), 1200);
      }
    } finally { setSaving(false); }
  }

  async function onDelete(id: number) {
    if (!confirm('Удалить проект?')) return;
    const r = await fetch(`/catalog/api/settings/projects?id=${id}`, { method:'DELETE' });
    const d = await r.json();
    if (r.ok && d.ok) setItems(prev => prev.filter((p:any)=>p.id!==id));
  }

  return (
    <div className="card" style={{marginTop:16}}>
      <div className="cardBody">
        <div className="row space" style={{marginBottom:8}}>
          <div className="h2">Проекты</div>
          {!loading && (
            <div className="p" style={{opacity:.8}}>{items.length} шт.</div>
          )}
        </div>

        <form onSubmit={onAdd} className="grid1" style={{marginBottom:12}}>
          <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:8}}>
            <input className="input" placeholder="Название проекта *" value={title} onChange={(e)=>setTitle(e.target.value)} required />
            <input className="input" placeholder="Роль" value={role} onChange={(e)=>setRole(e.target.value)} />
          </div>
          <textarea className="input" placeholder="Описание" value={description} onChange={(e)=>setDescription(e.target.value)} style={{minHeight:80}} />
          <input className="input" type="file" multiple accept="image/*,video/*" onChange={(e)=> setFiles(Array.from(e.target.files || [])) } />
          {files.length>0 && (
            <div className="dzFiles">
              {files.map((f, i)=> (
                <div key={i} className="dzFile">{f.name}</div>
              ))}
            </div>
          )}
          <div className="row" style={{justifyContent:'space-between', alignItems:'center'}}>
            {msg && <span className="p" style={{color:'#10a37f'}}>{msg}</span>}
            <button className="btn" type="submit" disabled={saving}>{saving? 'Сохранение…' : 'Добавить проект'}</button>
          </div>
        </form>

        <hr className="hr" />

        {loading ? (
          <p className="p">Загрузка…</p>
        ) : items.length === 0 ? (
          <p className="p">Проектов пока нет.</p>
        ) : (
          <div className="grid" style={{gridTemplateColumns:'1fr', gap:12}}>
            {items.map((p:any)=> (
              <div key={p.id} className="card" style={{border:'1px solid var(--border)'}}>
                <div className="cardBody">
                  <div className="row space" style={{alignItems:'baseline'}}>
                    <div className="h2" style={{margin:0}}>{p.title}</div>
                    <button className="btn btn--ghost" onClick={()=>onDelete(p.id)}>Удалить</button>
                  </div>
                  <div className="p" style={{marginTop:4, opacity:.85}}>
                    {[p.role, p.description].filter(Boolean).join(' · ') || '—'}
                  </div>
                  {Array.isArray(p.media) && p.media.length>0 && (
                    <div className="grid" style={{gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:10}}>
                      {p.media.map((m:any)=> (
                        <div key={m.id} style={{border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', background:'#0f1114'}}>
                          {String(m.media_type||'').startsWith('video/') ? (
                            <video src={m.url} controls style={{width:'100%', height:160, objectFit:'cover'}} />
                          ) : (
                            <img src={m.url} alt="" style={{width:'100%', height:160, objectFit:'cover'}} />
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
