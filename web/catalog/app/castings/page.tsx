"use client";
import { useEffect, useState } from "react";
import { api, bp } from "../../lib/http";

export default function PublicCastingsListPage() {
  const [items, setItems] = useState<Array<{id:number; title:string; description:string|null; created_at:string}>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(api('/api/public/castings'));
        const d = await r.json();
        if (d.ok) setItems(d.items || []);
      } finally { setLoading(false); }
    })();
  }, []);

  return (
    <div style={{maxWidth:900, margin:'0 auto'}}>
      <h1 className="h1">Кастинги</h1>
      {loading ? (
        <p className="p">Загрузка…</p>
      ) : items.length === 0 ? (
        <p className="p">Пока нет кастингов.</p>
      ) : (
        <div className="grid">
          {items.map(c => (
            <a key={c.id} className="card" href={bp(`/castings/${c.id}`)}>
              <div className="cardBody">
                <div className="h2">{c.title}</div>
                <div className="p" style={{color:'#666'}}>{c.description || 'без описания'}</div>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
