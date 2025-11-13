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
        <Gallery userId={a.user_id} name={a.full_name || "Актёр"} />
      </div>
      <div>
        <div className="card" style={{padding:16, marginBottom:16}}>
          <ActorActions actorUserId={a.user_id} instagram={a.instagram} />
        </div>
        <div className="card" style={{padding:16}}>
          <div className="h2" style={{marginBottom:8}}>{a.full_name}</div>
          <div className="p">{[(a.sex), (a.age_range), (a.cities)].filter(Boolean).join(" · ")}</div>
        </div>
      </div>
    </section>
  );
}
