"use client";
import { useEffect, useState } from "react";
import SendCastingButton from "./SendCastingButton";
import { api, bp } from "../lib/http";

export default function ActorActions({ actorUserId, instagram }: { actorUserId: number; instagram?: string | null }) {
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ok = true;
    fetch(api(`/api/favorites?actor=${actorUserId}`)).then(async (r) => {
      if (r.status === 401) return;
      const d = await r.json();
      if (ok && d.ok) setLiked(!!d.liked);
    }).catch(()=>{});
    return () => { ok = false };
  }, [actorUserId]);

  async function toggleFav() {
    if (loading) return;
    setLoading(true);
    try {
      if (!liked) {
        const r = await fetch(api(`/api/favorites`), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ actor_user_id: actorUserId }) });
        if (r.status === 401) { location.href = bp('/login'); return; }
        const d = await r.json(); if (d.ok) setLiked(true);
      } else {
        const r = await fetch(api(`/api/favorites?actor=${actorUserId}`), { method:'DELETE' });
        if (r.status === 401) { location.href = bp('/login'); return; }
        const d = await r.json(); if (d.ok) setLiked(false);
      }
    } finally { setLoading(false); }
  }

  const instaHref = instagram ? (/^(https?:)?\/\//i.test(instagram) ? instagram : `https://${instagram}`) : undefined;
  const btnStyle: React.CSSProperties = { minHeight: 40, padding: '10px 14px', fontWeight: 500, lineHeight: 1.2 };

  return (
    <div className="row" style={{marginTop:12, gap:8, justifyContent:'center', flexWrap:'wrap'}}>
      {instaHref && (
        <a className="btn" style={btnStyle} href={instaHref} target="_blank" rel="noopener noreferrer">Написать актёру</a>
      )}
      <SendCastingButton actorUserId={actorUserId} buttonClassName="btn" buttonStyle={btnStyle} />
      <button className="btn" style={btnStyle} onClick={toggleFav} disabled={loading}>{liked ? '❤ В избранном' : '♡ В избранное'}</button>
    </div>
  );
}
