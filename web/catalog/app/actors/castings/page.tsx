// web/catalog/app/actors/castings/page.tsx
import React from "react";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "/catalog";

async function loadData() {
  const h = headers();
  const host = h.get('host') || 'localhost:3000';
  const proto = host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https';
  const origin = `${proto}://${host}`;
  const r = await fetch(`${origin}${BASE}/api/actors/castings`, { cache: "no-store" });
  const d = await r.json();
  return d.items || [];
}

export default async function ActorsCastingsPage() {
  const items = await loadData();
  return (
    <div style={{maxWidth:980, margin:'0 auto'}}>
      <div className="row" style={{justifyContent:'space-between', alignItems:'end', gap:12}}>
        <div>
          <h1 className="h1">Открытые кастинги</h1>
          <p className="p" style={{color:'#9aa0a6'}}>Выберите кастинг, чтобы посмотреть детали и портфолио кастинг‑директора.</p>
        </div>
      </div>
      <hr className="hr" />

      {items.length === 0 ? (
        <p className="p">Кастингов пока нет.</p>
      ) : (
        <div className="grid" style={{gridTemplateColumns:'1fr', gap:12}}>
          {items.map((c:any)=> (
            <a key={c.id} href={`${BASE}/actors/castings/${c.id}`} className="castBtn">
              <div className="castTitle">{c.title}</div>
              <div className="castDesc">{[c.company_name, c.company_role].filter(Boolean).join(' · ') || '—'}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
