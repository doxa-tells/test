import { currentUser } from "../../lib/auth";
import { ensureTables, listFavoriteActors, type Actor } from "../../lib/db";
import ActorCard from "../../components/ActorCard";

export const dynamic = "force-dynamic";

export default async function FavoritesPage() {
  await ensureTables();
  const user = await currentUser();
  if (!user) {
    return (
      <div style={{maxWidth:900, margin:'0 auto'}}>
        <h1 className="h1" style={{textAlign:'center'}}>Моя подборка</h1>
        <p className="p" style={{textAlign:'center'}}>Войдите, чтобы просматривать избранных актёров.</p>
        <div className="row" style={{justifyContent:'center'}}>
          <a className="btn" href="/login">Войти</a>
        </div>
      </div>
    );
  }

  const items: Actor[] = await listFavoriteActors(user.id);

  return (
    <div style={{maxWidth:1000, margin:'0 auto'}}>
      <h1 className="h1" style={{textAlign:'center'}}>Моя подборка</h1>
      <hr className="hr" />
      {items.length === 0 ? (
        <p className="p" style={{textAlign:'center'}}>Здесь появятся актёры, которых вы добавили в избранное.</p>
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