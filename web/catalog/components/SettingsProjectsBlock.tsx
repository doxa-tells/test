"use client";
import React from "react";
import { createPortal } from "react-dom";

export default function SettingsProjectsBlock() {
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [title, setTitle] = React.useState('');
  const [role, setRole] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [links, setLinks] = React.useState('');
  const [production, setProduction] = React.useState('');
  const [year, setYear] = React.useState('');
  const [genre, setGenre] = React.useState('');
  const [format, setFormat] = React.useState('');
  const [platform, setPlatform] = React.useState('');
  const [country, setCountry] = React.useState('');
  const [city, setCity] = React.useState('');
  const [responsibilities, setResponsibilities] = React.useState('');
  const [awards, setAwards] = React.useState('');
  const [files, setFiles] = React.useState<File[]>([]);
  const [msg, setMsg] = React.useState<string>('');
  const [open, setOpen] = React.useState(false);
  // Lock scroll and handle Esc when modal open
  React.useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open]);

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
      if (links.trim()) fd.append('links', links.trim());
      if (production.trim()) fd.append('production', production.trim());
      if (year.trim()) fd.append('year', year.trim());
      if (genre.trim()) fd.append('genre', genre.trim());
      if (format.trim()) fd.append('format', format.trim());
      if (platform.trim()) fd.append('platform', platform.trim());
      if (country.trim()) fd.append('country', country.trim());
      if (city.trim()) fd.append('city', city.trim());
      if (responsibilities.trim()) fd.append('responsibilities', responsibilities.trim());
      if (awards.trim()) fd.append('awards', awards.trim());
      for (const f of files) fd.append('files', f);
      const r = await fetch('/catalog/api/settings/projects', { method:'POST', body: fd });
      const d = await r.json();
      if (r.ok && d.ok) {
        setTitle(''); setRole(''); setDescription(''); setLinks('');
        setProduction(''); setYear(''); setGenre(''); setFormat(''); setPlatform(''); setCountry(''); setCity(''); setResponsibilities(''); setAwards('');
        setFiles([]);
        setMsg('Проект добавлен');
        await load();
        setTimeout(()=>{ setMsg(''); setOpen(false); }, 800);
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
        </div>

        <div className="row" style={{justifyContent:'flex-end'}}>
          <button className="btn" onClick={()=>setOpen(true)}>Добавить проект</button>
        </div>

        {open && typeof window !== 'undefined' && createPortal(
          <div className="overlay" onClick={()=>!saving && setOpen(false)}>
            <div className="modal" style={{maxWidth:720, width:'90vw'}} onClick={(e)=>e.stopPropagation()}>
              <div className="modalBody">
                <div className="row space">
                  <div className="h2">Новый проект</div>
                  <button className="btn btn--ghost" onClick={()=>!saving && setOpen(false)} aria-label="Закрыть">✕</button>
                </div>
                <form onSubmit={onAdd} className="grid1">
                  <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:8}}>
                    <input className="input" placeholder="Название проекта *" value={title} onChange={(e)=>setTitle(e.target.value)} required />
                    <input className="input" placeholder="Роль" value={role} onChange={(e)=>setRole(e.target.value)} />
                  </div>
                  <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:8}}>
                    <input className="input" placeholder="Производство (компания/студия)" value={production} onChange={(e)=>setProduction(e.target.value)} />
                    <input className="input" placeholder="Год" value={year} onChange={(e)=>setYear(e.target.value.replace(/[^0-9]/g,''))} />
                  </div>
                  <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:8}}>
                    <input className="input" placeholder="Жанр (напр. драма)" value={genre} onChange={(e)=>setGenre(e.target.value)} />
                    <input className="input" placeholder="Формат (полный метр, сериал...)" value={format} onChange={(e)=>setFormat(e.target.value)} />
                  </div>
                  <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:8}}>
                    <input className="input" placeholder="Платформа (кинотеатр/онлайн)" value={platform} onChange={(e)=>setPlatform(e.target.value)} />
                    <input className="input" placeholder="Страна" value={country} onChange={(e)=>setCountry(e.target.value)} />
                  </div>
                  <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:8}}>
                    <input className="input" placeholder="Город" value={city} onChange={(e)=>setCity(e.target.value)} />
                    <input className="input" placeholder="Награды (кратко)" value={awards} onChange={(e)=>setAwards(e.target.value)} />
                  </div>
                  <textarea className="input" placeholder="Задачи/обязанности (кратко)" value={responsibilities} onChange={(e)=>setResponsibilities(e.target.value)} style={{minHeight:80}} />
                  <textarea className="input" placeholder="Описание проекта" value={description} onChange={(e)=>setDescription(e.target.value)} style={{minHeight:120}} />
                  <textarea className="input" placeholder="Ссылки (через пробел или с новой строки)" value={links} onChange={(e)=>setLinks(e.target.value)} style={{minHeight:80}} />
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
                    <button className="btn" type="submit" disabled={saving || !title.trim()}>{saving? 'Сохранение…' : 'Создать'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>, document.body
        )}

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
                    {[
                      p.role,
                      p.production,
                      p.year,
                      p.genre,
                      p.format,
                      p.platform,
                      [p.country, p.city].filter(Boolean).join(', ')
                    ].filter(Boolean).join(' · ') || '—'}
                  </div>
                  {p.links && (
                    <div className="row" style={{gap:8, flexWrap:'wrap', marginTop:8}}>
                      {String(p.links).split(/\s+/).filter((s:string)=>/^https?:\/\//i.test(s)).slice(0,8).map((u:string, i:number)=> (
                        <a key={i} className="btn btn--ghost" href={u} target="_blank" rel="noreferrer noopener" style={{padding:'6px 10px'}}>
                          {u}
                        </a>
                      ))}
                    </div>
                  )}
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
