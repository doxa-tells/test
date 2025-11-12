"use client";
import { useEffect, useState } from "react";
import { api, bp } from "../lib/http";

export default function SendCastingButton({ actorUserId }: { actorUserId: number }) {
  const [open, setOpen] = useState(false);
  const [castings, setCastings] = useState<Array<{id:number; title:string}>>([]);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState<string | null>(null);

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
      <button className="btn" onClick={() => setOpen(true)}>Отправить кастинг</button>
      {open && (
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
                <div className="grid" style={{gridTemplateColumns:'1fr'}}>
                  {castings.map((c)=> (
                    <button key={c.id} className="btn" onClick={()=>send(c.id)} disabled={loading}>
                      {loading? 'Отправка...' : c.title}
                    </button>
                  ))}
                </div>
              )}
              <hr className="hr" />
              <div className="row" style={{justifyContent:'flex-end'}}>
                <button className="btn btn--ghost" onClick={()=>setOpen(false)}>Закрыть</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
