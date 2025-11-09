import { currentUser } from "../../lib/auth";
import { ensureTables, listActors, getUserPrefs, type Actor } from "../../lib/db";
import ActorCard from "../../components/ActorCard";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  await ensureTables();
  const user = await currentUser();
  if (!user) {
    return (
      <div>
        <h1 className="h1">Моя подборка</h1>
        <p className="p">Войдите, чтобы просматривать избранных актёров.</p>
        <a className="btn" href="/login">Войти</a>
      </div>
    );
  }

  const prefs = await getUserPrefs(user.id);
  if (!prefs) {
    return (
      <div>
        <h1 className="h1">Моя подборка</h1>
        <p className="p">Настройте предпочтения, и мы подберём актёров под ваш запрос.</p>
        <a className="btn" href="/settings">Открыть настройки</a>
      </div>
    );
  }

  const items: Actor[] = await listActors({
    sex: prefs.sex ?? undefined,
    city: prefs.city ?? undefined,
    look_type: prefs.look_type ?? undefined,
    body_type: prefs.body_type ?? undefined,
    hair_color: prefs.hair_color ?? undefined,
    eye_color: prefs.eye_color ?? undefined,
    lang: prefs.lang ?? undefined,
    heightMin: prefs.height_min ?? undefined,
    heightMax: prefs.height_max ?? undefined,
    ageFrom: prefs.age_from ?? undefined,
    ageTo: prefs.age_to ?? undefined,
    limit: 96,
    offset: 0,
  });

  return (
    <div>
      <h1 className="h1">Моя подборка</h1>
      <hr className="hr" />
      {items.length === 0 ? (
        <p className="p">Ничего не найдено под текущие предпочтения. Измените фильтры в настройках.</p>
      ) : (
        <div className="grid">
          {items.map((a) => (
            <ActorCard key={a.user_id} a={a} />
          ))}
        </div>
      )}
    </div>
  );
}