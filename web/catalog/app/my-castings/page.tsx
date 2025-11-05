// web/catalog/app/my-castings/page.tsx
import { ensureTables, listMyCastings } from "../../lib/db";
import { currentUser } from "../../lib/auth";

export const dynamic = "force-dynamic";

export default async function MyCastingsPage() {
  await ensureTables();
  const user = await currentUser();
  if (!user) {
    return (
      <div>
        <h1 className="h1">Мои кастинги</h1>
        <p className="p">Авторизуйтесь, чтобы продолжить.</p>
        <a className="btn" href="/login">Войти</a>
      </div>
    );
  }

  const items = await listMyCastings(user.id);

  return (
    <div>
      <div className="row" style={{justifyContent:'space-between'}}>
        <h1 className="h1">Мои кастинги</h1>
        <form action="/api/castings" method="post" style={{display:'flex', gap:8}}>
          <input className="input" name="title" placeholder="Название кастинга" required />
          <input className="input" name="description" placeholder="Описание (опционально)" />
          <button className="btn">Создать</button>
        </form>
      </div>

      <hr className="hr" />

      {items.length === 0 ? (
        <p className="p">Пока пусто. Создайте первый кастинг.</p>
      ) : (
        <div className="grid">
          {items.map((c: any) => (
            <a key={c.id} href={`/my-castings/${c.id}`} className="card">
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
