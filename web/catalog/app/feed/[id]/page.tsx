// web/catalog/app/feed/[id]/page.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { api, bp } from "../../../lib/http";

export default function FeedCastingPage({ params }: { params: { id: string } }) {
  const castingId = Number(params.id);
  const [title, setTitle] = useState<string>(`Кастинг #${castingId}`);
  const [auditions, setAuditions] = useState<Array<{actor_user_id:number; url:string}> | null>(null);
  const [actors, setActors] = useState<any[] | null>(null);
  const [i, setI] = useState(0);
  const cardRef = useRef<HTMLDivElement|null>(null);
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    // Заголовок кастинга
    fetch(api(`/api/castings/${castingId}`)).then(async (r) => {
      if (r.ok) {
        const d = await r.json();
        if (d?.ok && d.item?.title) setTitle(String(d.item.title));
      }
    }).catch(()=>{});

    // Сначала пробуем загрузить видео‑пробы
    fetch(api(`/api/castings/${castingId}/auditions`)).then(async (r) => {
      if (r.status === 401) { location.href = bp('/login'); return; }
      const d = await r.json();
      const list = (d.items || []).map((x:any)=>({ actor_user_id: Number(x.actor_user_id), url: x.url }));
      if (list.length > 0) {
        setAuditions(list);
      } else {
        // fallback: подбор актёров
        fetch(api(`/api/castings/${castingId}/actors`)).then(async (r2) => {
          if (r2.status === 401) { location.href = bp('/login'); return; }
          const d2 = await r2.json();
          setActors(d2.items || []);
        });
      }
    });
  }, []);

  const mode = auditions && auditions.length > 0 ? 'auditions' : 'actors';
  const current = mode === 'auditions' ? (auditions ? auditions[i] : null) : (actors ? actors[i] : null);
  const actorId = current ? (mode === 'auditions' ? (current as any).actor_user_id : (current as any).user_id) : null;

  async function decide(decision: 'like'|'skip') {
    if (!current) return;
    if (cardRef.current) {
      cardRef.current.style.transform = decision === 'like' ? 'translateX(40px) rotate(3deg)' : 'translateX(-40px) rotate(-3deg)';
      cardRef.current.style.opacity = '0.85';
    }
    const actor_user_id = mode === 'auditions' ? (current as any).actor_user_id : (current as any).user_id;
    await fetch(api(`/api/castings/${castingId}/decision`), { method: 'POST', body: JSON.stringify({ actor_user_id, decision }) });
    setI((v) => v + 1);
    if (cardRef.current) {
      setTimeout(()=>{
        if (cardRef.current) {
          cardRef.current.style.transform = '';
          cardRef.current.style.opacity = '1';
        }
      }, 120);
    }
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') decide('like');
      else if (e.key === 'ArrowLeft') decide('skip');
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, auditions, actors]);

  return (
    <div style={{maxWidth:900, margin:'0 auto'}}>
      <div className="row" style={{justifyContent:'center'}}>
        <h1 className="h1" style={{textAlign:'center'}}>{title}</h1>
      </div>
      <div className="row" style={{justifyContent:'center', marginTop:8}}>
        <a className="btn btn--ghost" href={bp('/my-castings')}>Назад к кастингам</a>
      </div>
      <hr className="hr" />

      {!current ? (
        <p className="p" style={{textAlign:'center'}}>{mode === 'auditions' ? 'Видео‑пробы закончились.' : 'Актёры закончились.'}</p>
      ) : (
        <div className="card cardInteractive" style={{maxWidth:520, margin:'0 auto'}} ref={cardRef}>
          {mode === 'auditions' ? (
            <div className="cardBody">
              <video style={{width:'100%', borderRadius:12}} controls src={bp((current as any).url)} />
              <div className="row" style={{marginTop:10, justifyContent:'center', gap:8}}>
                <button className="btn" onClick={() => decide('like')}>👍 Нравится</button>
                <button className="btn btn--ghost" onClick={() => setAboutOpen(true)}>Об актёре</button>
                <button className="btn btn--secondary" onClick={() => decide('skip')}>Пропустить</button>
              </div>
            </div>
          ) : (
            <>
              <img className="thumb" src={`/media/${(current as any).user_id}/photo/1`} alt={(current as any).full_name || ''} />
              <div className="cardBody">
                <div className="h2" style={{textAlign:'center'}}>{(current as any).full_name}</div>
                <p className="p" style={{textAlign:'center'}}>{[(current as any).sex, (current as any).age_range, (current as any).cities].filter(Boolean).join(" · ")}</p>
                <div className="row" style={{marginTop:10, justifyContent:'center', gap:8}}>
                  <button className="btn" onClick={() => decide('like')}>👍 Нравится</button>
                  <button className="btn btn--ghost" onClick={() => setAboutOpen(true)}>Об актёре</button>
                  <button className="btn btn--secondary" onClick={() => decide('skip')}>Пропустить</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {aboutOpen && actorId && createPortal(
        <div className="overlay" onClick={()=>setAboutOpen(false)}>
          <div className="modal" style={{width:'90vw', maxWidth:980, height:'85vh'}} onClick={(e)=>e.stopPropagation()}>
            <div className="modalBody" style={{padding:0, height:'100%'}}>
              <iframe src={bp(`/embed/actor/${actorId}`)} title="Об актёре" style={{border:0, width:'100%', height:'100%', borderRadius:12}} />
            </div>
          </div>
        </div>, document.body
      )}
    </div>
  );
}

