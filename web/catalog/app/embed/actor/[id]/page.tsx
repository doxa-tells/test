// web/catalog/app/embed/actor/[id]/page.tsx
import { notFound } from "next/navigation";
import { getActorById, type Actor } from "../../../../lib/db";
import Gallery from "../../../../components/Gallery";
import ActorActions from "../../../../components/ActorActions";

export const dynamic = "force-dynamic";

export default async function ActorEmbedPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return notFound();

  const a: Actor | undefined = await getActorById(id);
  if (!a) return notFound();

  return (
    <section style={{display:'grid', gridTemplateColumns:'minmax(360px, 520px) 1fr', gap:24, alignItems:'start'}}>
      <div>
        <Gallery userId={a.user_id} name={a.full_name || "Актёр"} layout="featured" />
      </div>
      <div>
        <div className="card" style={{padding:16, marginBottom:16}}>
          <ActorActions actorUserId={a.user_id} instagram={a.instagram} />
        </div>
        <div className="card" style={{padding:0, overflow:'hidden'}}>
          <div className="cardBody" style={{padding:16, paddingBottom:0}}>
            <div className="h2" style={{marginBottom:8}}>{a.full_name}</div>
            <div className="p">{[a.sex, a.age_range, a.cities].filter(Boolean).join(" · ")}</div>
          </div>
          <table className="table" style={{margin:0}}>
            <tbody>
              <tr><td style={{ textAlign: 'center' }}>Пол</td><td style={{ textAlign: 'center' }}>{a.sex || '—'}</td></tr>
              <tr><td style={{ textAlign: 'center' }}>Игровой возраст</td><td style={{ textAlign: 'center' }}>{a.age_range || '—'}</td></tr>
              <tr><td style={{ textAlign: 'center' }}>Города</td><td style={{ textAlign: 'center' }}>{a.cities || '—'}</td></tr>
              <tr><td style={{ textAlign: 'center' }}>Типаж</td><td style={{ textAlign: 'center' }}>{a.look_type || '—'}</td></tr>
              <tr><td style={{ textAlign: 'center' }}>Телосложение</td><td style={{ textAlign: 'center' }}>{a.body_type || '—'}</td></tr>
              <tr><td style={{ textAlign: 'center' }}>Рост</td><td style={{ textAlign: 'center' }}>{a.height_cm ?? '—'}</td></tr>
              <tr><td style={{ textAlign: 'center' }}>Вес</td><td style={{ textAlign: 'center' }}>{a.weight_kg ?? '—'}</td></tr>
              <tr><td style={{ textAlign: 'center' }}>Цвет волос</td><td style={{ textAlign: 'center' }}>{a.hair_color || '—'}</td></tr>
              <tr><td style={{ textAlign: 'center' }}>Тип волос</td><td style={{ textAlign: 'center' }}>{a.hair_type || '—'}</td></tr>
              <tr><td style={{ textAlign: 'center' }}>Цвет глаз</td><td style={{ textAlign: 'center' }}>{a.eye_color || '—'}</td></tr>
              <tr><td style={{ textAlign: 'center' }}>Языки</td><td style={{ textAlign: 'center' }}>{a.languages || '—'}</td></tr>
              <tr><td style={{ textAlign: 'center' }}>Instagram</td><td style={{ textAlign: 'center' }}>{a.instagram ? (<a href={/^https?:\/\//i.test(a.instagram) ? a.instagram : `https://${a.instagram}`} target="_blank" rel="noopener noreferrer">{a.instagram}</a>) : '—'}</td></tr>
              <tr><td style={{ textAlign: 'center' }}>Видеовизитка</td><td style={{ textAlign: 'center' }}>{a.video_vizitka ? (<a href={/^https?:\/\//i.test(a.video_vizitka) ? a.video_vizitka : `https://${a.video_vizitka}`} target="_blank" rel="noopener noreferrer">{a.video_vizitka}</a>) : '—'}</td></tr>
              <tr><td style={{ textAlign: 'center' }}>Шоурил</td><td style={{ textAlign: 'center' }}>{a.showreel ? (<a href={/^https?:\/\//i.test(a.showreel) ? a.showreel : `https://${a.showreel}`} target="_blank" rel="noopener noreferrer">{a.showreel}</a>) : '—'}</td></tr>
              <tr><td style={{ textAlign: 'center' }}>Портфолио</td><td style={{ textAlign: 'center' }}>{a.portfolio ? (<a href={/^https?:\/\//i.test(a.portfolio) ? a.portfolio : `https://${a.portfolio}`} target="_blank" rel="noopener noreferrer">{a.portfolio}</a>) : '—'}</td></tr>
              <tr><td style={{ textAlign: 'center' }}>Проекты</td><td style={{ textAlign: 'center' }}>{a.projects || '—'}</td></tr>
              <tr><td style={{ textAlign: 'center' }}>Навыки</td><td style={{ textAlign: 'center' }}>{a.skills || '—'}</td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
