// web/catalog/app/actors/castings/[id]/page.tsx
import React from "react";
import ActorAuditionForm from "../../../../components/ActorAuditionForm";
import ActorDirectorProfile from "../../../../components/ActorDirectorProfile";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

const BASE = process.env.NEXT_PUBLIC_BASE_PATH || "/catalog";

async function loadData(id: number) {
  const h = headers();
  const host = h.get('host') || 'localhost:3000';
  const proto = host.includes('localhost') || host.startsWith('127.') ? 'http' : 'https';
  const origin = `${proto}://${host}`;
  const r = await fetch(`${origin}${BASE}/api/actors/castings/${id}`, { cache: "no-store" });
  const d = await r.json();
  // also load materials for this casting (public)
  const rFiles = await fetch(`${origin}${BASE}/api/actors/castings/${id}/files`, { cache: 'no-store' });
  const files = await rFiles.json().catch(()=>({items:[]}));
  return { ...d, files: files.items || [] };
}

export default async function ActorCastingDetailsPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  const d = await loadData(id);
  const casting = d.casting;
  const company = d.company;
  const avatar_url = d.avatar_url;
  const prefs = d.prefs;
  const portfolio = d.portfolio || [];
  const files = d.files || [];
  const owner = !!d.owner;

  function renderPrefs(p: any) {
    if (!p) return null;
    const labels: Record<string,string> = {
      role_title: 'Роль',
      project: 'Проект',
      city: 'Город',
      sex: 'Пол',
      look_type: 'Типаж',
      body_type: 'Телосложение',
      hair_color: 'Цвет волос',
      eye_color: 'Цвет глаз',
      lang: 'Язык',
      notes: 'Заметки',
      requirements: 'Требования',
    };
    const chips: string[] = [];
    if (p.height_min || p.height_max) chips.push(`Рост: ${p.height_min ?? '—'}–${p.height_max ?? '—'} см`);
    if (p.age_from || p.age_to) chips.push(`Возраст: ${p.age_from ?? '—'}–${p.age_to ?? '—'}`);
    if (p.weight_min || p.weight_max) chips.push(`Вес: ${p.weight_min ?? '—'}–${p.weight_max ?? '—'} кг`);
    const simple = Object.entries(labels)
      .map(([k, lab]) => (p[k] ? `${lab}: ${p[k]}` : null))
      .filter(Boolean) as string[];
    const list = [...chips, ...simple];
    if (list.length === 0) return <p className="p">Не указаны.</p>;
    return (
      <div className="kv">
        {list.map((t, i)=> (<span key={i}>{t}</span>))}
      </div>
    );
  }

  return (
    <div style={{maxWidth:980, margin:'0 auto'}}>
      <div className="row" style={{justifyContent:'space-between', alignItems:'end', gap:12}}>
        <div>
          <h1 className="h1">{casting?.title || 'Кастинг'}</h1>
          {company && <p className="p" style={{color:'#9aa0a6'}}>{[company.name, company.role].filter(Boolean).join(' · ')}</p>}
        </div>
      </div>
      <hr className="hr" />

      <div className="grid" style={{gridTemplateColumns:'280px 1fr', gap:24, alignItems:'start'}}>
        {/* Левая колонка: профиль с модалкой портфолио */}
        <ActorDirectorProfile
          avatar_url={avatar_url}
          company={company}
          portfolio={portfolio}
          files={files}
          owner={owner}
          castingId={id}
          base={BASE}
        />

        {/* Правая колонка: детали + портфолио + отклик */}
        <section className="grid" style={{gridTemplateColumns:'1fr', gap:16}}>
          {/* Описание */}
          {casting?.description && (
            <div className="card"><div className="cardBody">
              <div className="h2">Описание кастинга</div>
              <p className="p" style={{marginTop:6}}>{casting.description}</p>
            </div></div>
          )}

          {/* Требования */}
          <div className="card"><div className="cardBody">
            <div className="h2">Требования</div>
            {renderPrefs(prefs)}
          </div></div>

          {/* Материалы кастинга (под Требования) */}
          <div className="card"><div className="cardBody">
            <div className="h2">Материалы кастинга</div>
            {files.length === 0 ? (
              <p className="p">Материалы не прикреплены.</p>
            ) : (
              <div className="grid" style={{gridTemplateColumns:'1fr', gap:8}}>
                {files.map((f:any)=> (
                  <a key={f.id} className="btn btn--secondary" href={`${BASE}${f.url}`} target="_blank" rel="noreferrer noopener" style={{justifyContent:'flex-start'}}>
                    ⬇️ Скачать: {f.filename}
                  </a>
                ))}
              </div>
            )}
            {owner && (
              <form action={`${BASE}/api/castings/${id}/files`} method="post" encType="multipart/form-data" className="grid1" style={{marginTop:8}}>
                <input className="input" type="file" name="files" multiple />
                <div className="row end">
                  <button className="btn" type="submit">Загрузить материалы</button>
                </div>
              </form>
            )}
          </div></div>

          {/* Портфолио перенесено в модалку ActorDirectorProfile */}

          {/* Отклик */}
          <div className="card"><div className="cardBody">
            <div className="h2">Отклик на кастинг</div>
            <ActorAuditionForm castingId={id} />
          </div></div>
        </section>
      </div>
    </div>
  );
}
