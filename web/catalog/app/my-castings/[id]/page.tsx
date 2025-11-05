// web/catalog/app/my-castings/[id]/page.tsx
"use client";
import { useEffect, useMemo, useRef, useState } from "react";

export default function CastingDetail({ params }: { params: { id: string } }) {
  const castingId = Number(params.id);
  const [actors, setActors] = useState<any[]>([]);
  const [i, setI] = useState(0);
  const [files, setFiles] = useState<Array<{id:number; filename:string; url:string}>[]>([] as any);
  const cardRef = useRef<HTMLDivElement|null>(null);

  useEffect(() => {
    // simple fetch from public catalog with default filters (later add casting-specific)
    fetch(`/api/public-actors?limit=100`).then(r => r.json()).then(d => setActors(d.items || []));
  }, []);

  const a = actors[i];

  useEffect(() => {
    fetch(`/api/castings/${castingId}/files`).then(r=>r.json()).then(d=>{
      if (d.ok) setFiles(d.items || []);
    }).catch(()=>{});
  }, [castingId]);

  async function decide(decision: 'like'|'skip') {
    if (!a) return;
    // subtle animation
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
      <div className="row" style={{justifyContent:'space-between'}}>
        <h1 className="h1">Выборка актёров</h1>
        <form action="/api/upload" method="post" encType="multipart/form-data" className="row">
          <input type="hidden" name="casting_id" value={castingId} />
          <input className="input" type="file" name="file" />
          <button className="btn" type="submit">Прикрепить файл</button>
        </form>
      </div>

      <hr className="hr" />

      <div>
        <div className="h2" style={{marginBottom:8}}>Файлы</div>
        {!files || files.length === 0 ? (
          <p className="p">Нет файлов</p>
        ) : (
          <div className="grid" style={{gridTemplateColumns:'1fr 1fr'}}>
            {files.map((f:any)=> (
              <a key={f.id} className="card" href={f.url} target="_blank" rel="noopener noreferrer">
                <div className="cardBody">
                  <div className="h2" style={{fontSize:14}}>{f.filename}</div>
                  <p className="p">скачать</p>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {!a ? (
        <p className="p">Актёры закончились.</p>
      ) : (
        <div className="card" style={{maxWidth:420, transition:'transform .12s ease, opacity .12s ease'}} ref={cardRef}>
          <img className="thumb" src={`/media/${a.user_id}/photo/1`} alt={a.full_name || ''} />
          <div className="cardBody">
            <div className="h2">{a.full_name}</div>
            <p className="p">{[a.sex, a.age_range, a.cities].filter(Boolean).join(" · ")}</p>
            <div className="row" style={{marginTop:10}}>
              <button className="btn" onClick={() => decide('like')}>👍 Нравится</button>
              <button className="btn" onClick={() => decide('skip')}>Пропустить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
