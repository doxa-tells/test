"use client";
import { useEffect, useState } from "react";
import { api, bp } from "../../../lib/http";

export default function ActorLinkSettingsPage() {
  const [actorId, setActorId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Array<{user_id:number; full_name:string|null}>>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(api('/api/actor-link'));
        if (r.status === 401) { location.href = bp('/login'); return; }
        const d = await r.json();
        if (d.ok && d.actor_user_id) setActorId(String(d.actor_user_id));
      } finally { setLoading(false); }
    })();
  }, []);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    setMsg("");
    try {
      const r = await fetch(api('/api/actor-link'), { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({ actor_user_id: Number(actorId) }) });
      const d = await r.json();
      if (r.ok && d.ok) setMsg('Сохранено');
      else setMsg(d.error || 'Ошибка');
    } catch { setMsg('Ошибка сети'); }
    finally { setSaving(false); }
  }

  async function onSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!q.trim()) { setResults([]); return; }
    setSearching(true);
    try{
      const r = await fetch(api(`/api/actors/search?q=${encodeURIComponent(q.trim())}`));
      const d = await r.json();
      if (d.ok) setResults(d.items || []);
    } finally { setSearching(false); }
  }

  return (
    <div style={{maxWidth:600, margin:'0 auto'}}>
      <h1 className="h1">Привязка актёрского ID</h1>
      {loading ? (
        <p className="p">Загрузка…</p>
      ) : (
        <div className="grid1">
          <div className="section">
            <div className="h2">Найдите себя в базе актёров</div>
            <form onSubmit={onSearch} className="row" style={{gap:8}}>
              <input className="input" placeholder="Поиск по имени" value={q} onChange={(e)=>setQ(e.target.value)} />
              <button className="btn" type="submit" disabled={searching}>{searching? 'Поиск…' : 'Искать'}</button>
            </form>
            {results.length > 0 && (
              <div className="dzFiles" style={{marginTop:8}}>
                {results.map(r => (
                  <div key={r.user_id} className="dzFile row space" style={{alignItems:'center'}}>
                    <div className="p">{r.full_name || 'Без имени'} · ID: {r.user_id}</div>
                    <button className="btn btn--secondary" onClick={()=>setActorId(String(r.user_id))}>Выбрать</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <form onSubmit={onSave}>
            <div className="section">
              <label className="p" htmlFor="actorId">Ваш actor_user_id из базы (users.user_id)</label>
              <input id="actorId" className="input" value={actorId} onChange={(e)=>setActorId(e.target.value)} placeholder="например, 12345" inputMode="numeric" />
              <div className="p" style={{color:'#999'}}>Нужно один раз связать аккаунт с вашим актёрским профилем, чтобы отправлять видео‑пробы.</div>
            </div>
            <div className="btnGroup">
              <button className="btn" type="submit" disabled={saving}>{saving? 'Сохраняю…' : 'Сохранить'}</button>
              {msg && <span className="p" style={{marginLeft:12}}>{msg}</span>}
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
