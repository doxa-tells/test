// web/catalog/app/actor/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getActorById, type Actor } from "../../../lib/db";
import Gallery from "../../../components/Gallery";
import ActorActions from "../../../components/ActorActions";

export const dynamic = "force-dynamic";

function Row({ k, v }: { k: string; v?: ReactNode }) {
  if (v === undefined || v === null || v === "") return null;
  return (
    <tr>
      <td style={{ textAlign: 'center' }}>{k}</td>
      <td style={{ textAlign: 'center' }}>{v}</td>
    </tr>
  );
}

function asLink(u?: string | null): ReactNode {
  if (!u) return null;
  const s = u.trim();
  if (!s) return null;
  const href = /^(https?:)?\/\//i.test(s) ? s : `https://${s}`;
  return (
    <a href={href} target="_blank" rel="noopener noreferrer">
      {s}
    </a>
  );
}

export default async function ActorPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isFinite(id)) return notFound();

  const a: Actor | undefined = await getActorById(id);
  if (!a) return notFound();

  return (
    <>
      <Link className="btn" href="/">
        ← Назад
      </Link>
      <h1 className="h1" style={{ marginTop: 12 }}>{a.full_name}</h1>

      <section style={{display:'grid', gridTemplateColumns:'minmax(280px, 380px) 1fr', gap:24, alignItems:'start'}}>
        <div>
          <Gallery userId={a.user_id} name={a.full_name || "Актёр"} />
        </div>
        <div>
          <div className="card" style={{padding:16, marginBottom:16}}>
            <ActorActions actorUserId={a.user_id} instagram={a.instagram} />
          </div>
          <div className="card" style={{padding:0, overflow:'hidden'}}>
            <table className="table" style={{margin:0}}>
              <tbody>
                <Row k="Пол" v={a.sex} />
                <Row k="Игровой возраст" v={a.age_range} />
                <Row k="Города" v={a.cities} />
                <Row k="Типаж" v={a.look_type} />
                <Row k="Телосложение" v={a.body_type} />
                <Row k="Рост" v={a.height_cm} />
                <Row k="Вес" v={a.weight_kg} />
                <Row k="Цвет волос" v={a.hair_color} />
                <Row k="Тип волос" v={a.hair_type} />
                <Row k="Цвет глаз" v={a.eye_color} />
                <Row k="Языки" v={a.languages} />
                <Row k="Instagram" v={asLink(a.instagram)} />
                <Row k="Видеовизитка" v={asLink(a.video_vizitka)} />
                <Row k="Шоурил" v={asLink(a.showreel)} />
                <Row k="Портфолио" v={asLink(a.portfolio)} />
                <Row k="Проекты" v={a.projects} />
                <Row k="Навыки" v={a.skills} />
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </>
  );
}