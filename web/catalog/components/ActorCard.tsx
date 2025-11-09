// web/catalog/components/ActorCard.tsx
"use client";

import React, { useEffect, useState } from "react";
import type { Actor } from "../lib/types";
import { photoUrl } from "../lib/media";

export default function ActorCard({ a }: { a: Actor }) {
  const mainSrc = photoUrl(a.user_id, 1);
  const [liked, setLiked] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/favorites?actor=${a.user_id}`).then(async (r) => {
      if (r.status === 401) return; // not logged in
      const d = await r.json();
      if (alive && d.ok) setLiked(!!d.liked);
    }).catch(() => {});
    return () => { alive = false; };
  }, [a.user_id]);

  async function toggleFavorite(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (loading) return;
    setLoading(true);
    try {
      if (!liked) {
        const r = await fetch(`/api/favorites`, { method: 'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ actor_user_id: a.user_id }) });
        if (r.status === 401) { location.href = '/login'; return; }
        let d: any = { ok: false };
        try { d = await r.json(); } catch {}
        if (d.ok) setLiked(true);
      } else {
        const r = await fetch(`/api/favorites?actor=${a.user_id}`, { method: 'DELETE' });
        if (r.status === 401) { location.href = '/login'; return; }
        let d: any = { ok: false };
        try { d = await r.json(); } catch {}
        if (d.ok) setLiked(false);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <a href={`/actor/${a.user_id}`} className="card rel" title={a.full_name ?? ""}>
      <button
        aria-label={liked?"Удалить из избранного":"В избранное"}
        onClick={toggleFavorite}
        className={`iconBtn absTR ${liked ? 'iconBtn--active' : ''}`}>
        {liked ? '❤' : '♡'}
      </button>
      <img
        className="thumb"
        src={mainSrc}
        alt={a.full_name ?? ""}
        onError={(e) => { (e.currentTarget as HTMLImageElement).style.opacity = "0.6"; }}
      />
      <div className="cardBody">
        <div className="h2">{a.full_name || "Без имени"}</div>
        <p className="p">{[a.sex, a.age_range, a.cities].filter(Boolean).join(" · ")}</p>
        <div className="kv">
          {a.look_type && <span>{a.look_type}</span>}
          {a.height_cm && <span>{a.height_cm} см</span>}
          {a.hair_color && <span>{a.hair_color}</span>}
          {a.eye_color && <span>{a.eye_color}</span>}
        </div>
      </div>
    </a>
  );
}