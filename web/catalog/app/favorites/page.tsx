import { currentUser } from "../../lib/auth";
import { ensureTables, listFavoriteActors, type Actor } from "../../lib/db";
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

  const items: Actor[] = await listFavoriteActors(user.id);

  return (
    <div>
      <h1 className="h1">Моя подборка</h1>
      <hr className="hr" />
      {items.length === 0 ? (
        <p className="p">Пока пусто. Нажимайте сердце на карточке актёра, чтобы добавить в избранное.</p>
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