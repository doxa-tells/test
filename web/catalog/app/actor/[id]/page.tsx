// web/catalog/app/actor/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { getActorById, type Actor, photoUrl } from "../../../lib/db";

export const dynamic = "force-dynamic";

function Row({ k, v }: { k: string; v?: ReactNode }) {
  if (v === undefined || v === null || v === "") return null;
  return (
    <tr>
      <td>{k}</td>
      <td>{v}</td>
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

  const a: Actor | undefined = getActorById(id);
  if (!a) return notFound();

  return (
    <>
      <Link className="btn" href="/">
        ← Назад
      </Link>
      <h1 className="h1" style={{ marginTop: 12 }}>
        {a.full_name}
      </h1>

      <div className="grid" style={{ gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {[1, 2, 3, 4].map((n) => (
          <img
            key={n}
            className="thumb"
            src={photoUrl(a.user_id, n as 1 | 2 | 3 | 4)}
            alt={`${a.full_name ?? "Актёр"} фото ${n}`}
            loading="lazy"
          />
        ))}
      </div>

      <table className="table">
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
    </>
  );
}