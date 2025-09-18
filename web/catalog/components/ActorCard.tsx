// web/catalog/components/ActorCard.tsx
"use client";

import React from "react";
import type { Actor } from "../lib/types";
import { photoUrl } from "../lib/media";

export default function ActorCard({ a }: { a: Actor }) {
  const mainSrc = photoUrl(a.user_id, 1);

  return (
    <a href={`/actor/${a.user_id}`} className="card" title={a.full_name ?? ""}>
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