// web/catalog/components/ActorDirectorProfile.tsx
"use client";
import React from "react";
import { createPortal } from "react-dom";

export default function ActorDirectorProfile({
  avatar_url,
  company,
  portfolio,
  files,
  owner,
  castingId,
  base
}: {
  avatar_url: string | null;
  company: any;
  portfolio: any[];
  files: any[];
  owner: boolean;
  castingId: number;
  base: string;
}) {
  const [open, setOpen] = React.useState(false);
  React.useEffect(()=>{
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return ()=>{ document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [open]);

  return (
    <>
      {/* Summary card (left) */}
      <aside className="card" role="button" onClick={()=>setOpen(true)} style={{cursor:'pointer'}}>
        <div className="cardBody">
          <div className="row" style={{gap:12}}>
            <div style={{width:64, height:64, borderRadius:'50%', overflow:'hidden', border:'1px solid var(--border)'}}>
              {avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={`${base}${avatar_url}`} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}} />
              ) : (
                <div className="p" style={{width:'100%', height:'100%', display:'grid', placeItems:'center', color:'#6b7280'}}>—</div>
              )}
            </div>
            <div>
              <div className="h2" style={{margin:0}}>{company?.name || '—'}</div>
              <div className="p">{company?.role || '—'}</div>
            </div>
          </div>
          {company?.bio && (
            <p className="p" style={{marginTop:10}}>{company.bio}</p>
          )}
        </div>
      </aside>

      {open && typeof window !== 'undefined' && createPortal(
        <div className="overlay" onClick={()=>setOpen(false)}>
          <div className="modal" style={{maxWidth:980, width:'96vw'}} onClick={(e)=>e.stopPropagation()}>
            <div className="modalHeader">
              <div className="row space">
                <div className="h2">Профиль кастинг‑директора</div>
                <button className="btn btn--ghost" onClick={()=>setOpen(false)}>✕</button>
              </div>
            </div>
            <div className="modalBody">
              <div className="grid" style={{gridTemplateColumns:'260px 1fr', gap:16, alignItems:'start'}}>
                {/* Left profile in modal */}
                <div className="card"><div className="cardBody">
                  <div className="row" style={{gap:12}}>
                    <div style={{width:72, height:72, borderRadius:'50%', overflow:'hidden', border:'1px solid var(--border)'}}>
                      {avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={`${base}${avatar_url}`} alt="" style={{width:'100%', height:'100%', objectFit:'cover'}} />
                      ) : (
                        <div className="p" style={{width:'100%', height:'100%', display:'grid', placeItems:'center', color:'#6b7280'}}>—</div>
                      )}
                    </div>
                    <div>
                      <div className="h2" style={{margin:0}}>{company?.name || '—'}</div>
                      <div className="p">{company?.role || '—'}</div>
                    </div>
                  </div>
                  {company?.bio && (
                    <p className="p" style={{marginTop:10}}>{company.bio}</p>
                  )}
                </div></div>

                {/* Right content: Portfolio only */}
                <div className="grid" style={{gridTemplateColumns:'1fr', gap:12}}>
                  <div className="card"><div className="cardBody">
                    <div className="h2">Портфолио</div>
                    {portfolio.length === 0 ? (
                      <p className="p">Пока нет проектов.</p>
                    ) : (
                      <div className="grid" style={{gridTemplateColumns:'1fr', gap:12}}>
                        {portfolio.map((p:any)=> (
                          <div key={p.id} className="card" style={{border:'1px solid var(--border)'}}>
                            <div className="cardBody">
                              <div className="row space" style={{alignItems:'baseline'}}>
                                <div className="h2" style={{margin:0}}>{p.title}</div>
                              </div>
                              <div className="p" style={{marginTop:4, opacity:.85}}>
                                {[
                                  p.role,
                                  p.production,
                                  p.year,
                                  p.genre,
                                  p.format,
                                  p.platform,
                                  [p.country, p.city].filter(Boolean).join(', ')
                                ].filter(Boolean).join(' · ') || '—'}
                              </div>
                              {p.description && <p className="p" style={{marginTop:8}}>{p.description}</p>}
                              {p.links && (
                                <div className="row" style={{gap:8, flexWrap:'wrap', marginTop:8, justifyContent:'flex-start'}}>
                                  {String(p.links).split(/\s+/).filter((s:string)=>/^https?:\/\//i.test(s)).slice(0,8).map((u:string, i:number)=> (
                                    <a
                                      key={i}
                                      className="btn btn--ghost"
                                      href={u}
                                      target="_blank"
                                      rel="noreferrer noopener"
                                      style={{padding:'6px 10px', display:'inline-flex', alignItems:'center'}}
                                    >
                                      {u}
                                    </a>
                                  ))}
                                </div>
                              )}
                              {Array.isArray(p.media) && p.media.length>0 && (
                                <div className="grid" style={{gridTemplateColumns:'repeat(4,1fr)', gap:8, marginTop:10}}>
                                  {p.media.map((m:any)=> (
                                    <div key={m.id} style={{border:'1px solid var(--border)', borderRadius:8, overflow:'hidden', background:'#0f1114'}}>
                                      {String(m.media_type||'').startsWith('video/') ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <video src={`${base}${m.url}`} controls style={{width:'100%', height:160, objectFit:'cover'}} />
                                      ) : (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={`${base}${m.url}`} alt="" style={{width:'100%', height:160, objectFit:'cover'}} />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div></div>
                </div>
              </div>
            </div>
            <div className="modalFooter">
              <button className="btn btn--ghost" onClick={()=>setOpen(false)}>Закрыть</button>
            </div>
          </div>
        </div>, document.body)
      }
    </>
  );
}
