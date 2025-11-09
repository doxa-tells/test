// web/catalog/app/feed/page.tsx
import { ensureTables, listMyCastings } from "../../lib/db";
import { currentUser } from "../../lib/auth";

export const dynamic = "force-dynamic";

export default async function FeedIndexPage() {
  await ensureTables();
  const user = await currentUser();
  if (!user) {
    return (
      <div>
        <h1 className="h1">Моя лента</h1>
        <p className="p">Войдите, чтобы просматривать ленту свайпов по вашим кастингам.</p>
        <a className="btn" href="/login">Войти</a>
      </div>
    );
  }

  const items = await listMyCastings(user.id);

  return (
    <div>
      <div className="row space">
        <h1 className="h1">Моя лента</h1>
        <a className="btn" href="/my-castings">Управление кастингами</a>
      </div>
      <hr className="hr" />

      {items.length === 0 ? (
        <p className="p">Пока нет кастингов. Создайте кастинг и вернитесь сюда для свайпов.</p>
      ) : (
        <div className="grid">
          {items.map((c: any) => (
            <a key={c.id} href={`/feed/${c.id}`} className="card">
              <div className="cardBody">
                <div className="h2">{c.title}</div>
                <p className="p">{c.description || "без описания"}</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
