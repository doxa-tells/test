// web/catalog/app/feed/[id]/page.tsx
"use client";
import { useEffect, useRef, useState } from "react";

export default function FeedCastingPage({ params }: { params: { id: string } }) {
  const castingId = Number(params.id);
  const [actors, setActors] = useState<any[]>([]);
  const [i, setI] = useState(0);
  const cardRef = useRef<HTMLDivElement|null>(null);

  useEffect(() => {
    fetch(`/api/public-actors?limit=100`).then(r => r.json()).then(d => setActors(d.items || []));
  }, []);

  const a = actors[i];

  async function decide(decision: 'like'|'skip') {
    if (!a) return;
    if (cardRef.current) {
      cardRef.current.style.transform = decision === 'like' ? 'translateX(40px) rotate(3deg)' : 'translateX(-40px) rotate(-3deg)';
      cardRef.current.style.opacity = '0.85';
    }
    await fetch(`/api/castings/${castingId}/decision`, { method: 'POST', body: JSON.stringify({ actor_user_id: a.user_id, decision }) });
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
    <div>
      <div className="row space">
        <h1 className="h1">Моя лента · Кастинг #{castingId}</h1>
        <a className="btn btn--ghost" href="/feed">Назад к ленте</a>
      </div>
      <hr className="hr" />

      {!a ? (
        <p className="p">Актёры закончились.</p>
      ) : (
        <div className="card cardInteractive" style={{maxWidth:420}} ref={cardRef}>
          <img className="thumb" src={`/media/${a.user_id}/photo/1`} alt={a.full_name || ''} />
          <div className="cardBody">
            <div className="h2">{a.full_name}</div>
            <p className="p">{[a.sex, a.age_range, a.cities].filter(Boolean).join(" · ")}</p>
            <div className="row" style={{marginTop:10}}>
              <button className="btn" onClick={() => decide('like')}>👍 Нравится</button>
              <button className="btn btn--secondary" onClick={() => decide('skip')}>Пропустить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
