// web/catalog/app/feed/[id]/page.tsx
"use client";
import { useEffect, useRef, useState } from "react";
import { api, bp } from "../../../lib/http";

export default function FeedCastingPage({ params }: { params: { id: string } }) {
  const castingId = Number(params.id);
  const [actors, setActors] = useState<any[]>([]);
  const [i, setI] = useState(0);
  const cardRef = useRef<HTMLDivElement|null>(null);

  useEffect(() => {
    fetch(api(`/api/castings/${castingId}/actors`)).then(async (r) => {
      if (r.status === 401) { location.href = bp('/login'); return; }
      const d = await r.json();
      setActors(d.items || []);
    });
  }, []);

  const a = actors[i];

  async function decide(decision: 'like'|'skip') {
    if (!a) return;
    if (cardRef.current) {
      cardRef.current.style.transform = decision === 'like' ? 'translateX(40px) rotate(3deg)' : 'translateX(-40px) rotate(-3deg)';
      cardRef.current.style.opacity = '0.85';
    }
    await fetch(api(`/api/castings/${castingId}/decision`), { method: 'POST', body: JSON.stringify({ actor_user_id: a.user_id, decision }) });
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
  }, [a]);

  return (
    <div style={{maxWidth:900, margin:'0 auto'}}>
      <div className="row" style={{justifyContent:'center'}}>
        <h1 className="h1" style={{textAlign:'center'}}>Моя лента · Кастинг #{castingId}</h1>
      </div>
      <div className="row" style={{justifyContent:'center', marginTop:8}}>
        <a className="btn btn--ghost" href={bp('/feed')}>Назад к ленте</a>
      </div>
      <hr className="hr" />

      {!a ? (
        <p className="p" style={{textAlign:'center'}}>Актёры закончились.</p>
      ) : (
        <div className="card cardInteractive" style={{maxWidth:420, margin:'0 auto'}} ref={cardRef}>
          <img className="thumb" src={`/media/${a.user_id}/photo/1`} alt={a.full_name || ''} />
          <div className="cardBody">
            <div className="h2" style={{textAlign:'center'}}>{a.full_name}</div>
            <p className="p" style={{textAlign:'center'}}>{[a.sex, a.age_range, a.cities].filter(Boolean).join(" · ")}</p>
            <div className="row" style={{marginTop:10, justifyContent:'center', gap:8}}>
              <button className="btn" onClick={() => decide('like')}>👍 Нравится</button>
              <button className="btn btn--secondary" onClick={() => decide('skip')}>Пропустить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

