"use client";
import { useEffect, useState } from "react";
import SendCastingButton from "./SendCastingButton";

export default function ActorActions({ actorUserId, instagram }: { actorUserId: number; instagram?: string | null }) {
  const [liked, setLiked] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ok = true;
    fetch(`/api/favorites?actor=${actorUserId}`).then(async (r) => {
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
        const r = await fetch(`/api/favorites`, { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ actor_user_id: actorUserId }) });
        if (r.status === 401) { location.href = '/login'; return; }
        const d = await r.json(); if (d.ok) setLiked(true);
      } else {
        const r = await fetch(`/api/favorites?actor=${actorUserId}`, { method:'DELETE' });
        if (r.status === 401) { location.href = '/login'; return; }
        const d = await r.json(); if (d.ok) setLiked(false);
      }
    } finally { setLoading(false); }
  }

  const instaHref = instagram ? (/^(https?:)?\/\//i.test(instagram) ? instagram : `https://${instagram}`) : undefined;

  return (
    <div className="row" style={{marginTop:12, gap:8}}>
      {instaHref && (
        <a className="btn" href={instaHref} target="_blank" rel="noopener noreferrer">Написать актёру</a>
      )}
      <SendCastingButton actorUserId={actorUserId} />
      <button className="btn" onClick={toggleFav}>{liked ? '❤ В избранном' : '♡ В избранное'}</button>
    </div>
  );
}
