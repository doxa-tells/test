"use client";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api, bp } from "../lib/http";

export default function SendCastingButton({ actorUserId, buttonClassName, buttonStyle, label }: { actorUserId: number; buttonClassName?: string; buttonStyle?: React.CSSProperties; label?: string }) {
  const [open, setOpen] = useState(false);
  const [castings, setCastings] = useState<Array<{id:number; title:string}>>([]);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);

  async function loadCastings() {
    const r = await fetch(api('/api/castings'));
    if (r.status === 401) { location.href = bp('/login'); return; }
    const d = await r.json();
    if (d.ok) setCastings(d.items || []);
  }

  useEffect(() => {
    if (open) {
      loadCastings();
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function send(casting_id: number) {
    if (loading) return;
    setLoading(true);
    try {
      const r = await fetch(api('/api/send-casting'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ casting_id, actor_user_id: actorUserId }) });
      if (r.status === 401) { location.href = bp('/login'); return; }
      const d = await r.json();
      if (d.ok) { setSent('Отправлено'); setTimeout(()=>{ setOpen(false); setSent(null); }, 800); }
    } finally { setLoading(false); }
  }

  return (
    <>
      <button
        className={buttonClassName || "btn"}
        style={buttonStyle}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
      >
        {label || 'Отправить кастинг'}
      </button>
      {open && createPortal(
        <div className="overlay" onClick={()=>setOpen(false)}>
          <div className="modal" onClick={(e)=>e.stopPropagation()}>
            <div className="modalBody">
              <div className="h2" style={{marginBottom:10}}>Выберите кастинг</div>
              {sent && <div className="p" style={{color:'#10a37f'}}>{sent}</div>}
              {castings.length === 0 ? (
                <div className="section">
                  <p className="p">У вас пока нет кастингов.</p>
                  <a className="btn" href={bp('/my-castings')}>Создать</a>
                </div>
              ) : (
                <div className="section">
                  <div className="row" style={{gap:8}}>
                    <input className="input" placeholder="Поиск по названию" value={q} onChange={(e)=>{ setQ(e.target.value); setSelectedId(null); }} />
                  </div>
                  <div style={{maxHeight: 360, overflow:'auto', marginTop:8, border:'1px solid var(--line)', borderRadius:8}}>
                    {castings
                      .filter(c => !q.trim() || c.title.toLowerCase().includes(q.trim().toLowerCase()))
                      .map(c => {
                        const active = selectedId === c.id;
                        return (
                          <label
                            key={c.id}
                            className="row space"
                            style={{
                              padding:'10px 12px', cursor:'pointer', borderBottom:'1px solid var(--line)',
                              background: active ? 'rgba(16,163,127,.18)' : 'transparent',
                              outline: active ? '1px solid var(--accent)' : 'none'
                            }}
                            onClick={()=>setSelectedId(c.id)}
                          >
                            <div className="p" style={{marginRight:12, overflow:'hidden', textOverflow:'ellipsis'}} title={c.title}>{c.title}</div>
                            <input type="radio" name="castingPick" value={c.id} checked={active} onChange={()=>setSelectedId(c.id)} />
                          </label>
                        );
                      })}
                  </div>
                  <div className="row" style={{justifyContent:'space-between', gap:8, marginTop:12}}>
                    <div className="p" style={{opacity:.8, overflow:'hidden', textOverflow:'ellipsis'}}>
                      {selectedId ? `Выбрано: ${castings.find(c=>c.id===selectedId)?.title ?? ''}` : 'Ничего не выбрано'}
                    </div>
                    <div className="row" style={{gap:8}}>
                      <button className="btn btn--ghost" onClick={()=>setOpen(false)}>Отмена</button>
                      <button className="btn" disabled={!selectedId || loading} onClick={()=> selectedId && send(selectedId)}>{loading? 'Отправка…' : 'Отправить'}</button>
                    </div>
                  </div>
                </div>
              )}
              <hr className="hr" />
              <div className="row" style={{justifyContent:'flex-end'}}>
                <button className="btn btn--ghost" onClick={()=>setOpen(false)}>Закрыть</button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
