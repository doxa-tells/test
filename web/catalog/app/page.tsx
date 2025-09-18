// web/catalog/app/page.tsx
import { listActors, type Actor } from "../lib/db";
import ActorCard from "../components/ActorCard";
import FilterBar from "../components/FilterBar";

export const dynamic = "force-dynamic";

type SP = { [k: string]: string | string[] | undefined };

function asNum(v?: string | string[]) {
  if (!v) return undefined;
  const s = Array.isArray(v) ? v[0] : v;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}
function asStr(v?: string | string[]) {
  if (!v) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

export default async function Page({ searchParams }: { searchParams: SP }) {
  const actors: Actor[] = listActors({
    q: asStr(searchParams.q),
    sex: asStr(searchParams.sex),
    city: asStr(searchParams.city),
    look_type: asStr(searchParams.look),
    hair_color: asStr(searchParams.hair),
    eye_color: asStr(searchParams.eye),
    lang: asStr(searchParams.lang),
    heightMin: asNum(searchParams.hmin),
    heightMax: asNum(searchParams.hmax),
    ageFrom: asNum(searchParams.amin),
    ageTo: asNum(searchParams.amax),
    limit: 96,
    offset: 0,
  });

  return (
    <>
      <h1 className="h1">База актёров</h1>
      <p className="p">
        Все анкеты из общей базы. Фото тянутся из <code>data/user_media</code>.
      </p>

      {/* панель фильтров */}
      <FilterBar />

      <hr className="hr" />
      {actors.length === 0 ? (
        <p className="p">По заданным фильтрам ничего не найдено.</p>
      ) : (
        <div className="grid">
          {actors.map((a) => (
            <ActorCard key={a.user_id} a={a} />
          ))}
        </div>
      )}
    </>
  );
}