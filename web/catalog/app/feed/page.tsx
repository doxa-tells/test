// web/catalog/app/feed/page.tsx
import { ensureTables, listMyCastings } from "../../lib/db";
import { currentUser } from "../../lib/auth";

export const dynamic = "force-dynamic";

export default async function FeedIndexPage() {
  await ensureTables();
  const user = await currentUser();
  if (!user) {
    return (
      <div style={{maxWidth:900, margin:'0 auto'}}>
        <h1 className="h1" style={{textAlign:'center'}}>Моя лента</h1>
        <p className="p" style={{textAlign:'center'}}>Войдите, чтобы просматривать ленту свайпов по вашим кастингам.</p>
        <div className="row" style={{justifyContent:'center'}}>
          <a className="btn" href="/login">Войти</a>
        </div>
      </div>
    );
  }

  const items = await listMyCastings(user.id);

  return (
    <div style={{maxWidth:1000, margin:'0 auto'}}>
      <div className="row" style={{justifyContent:'center'}}>
        <h1 className="h1" style={{textAlign:'center'}}>Моя лента</h1>
      </div>
      <div className="row" style={{justifyContent:'center', marginTop:8}}>
        <a className="btn" href="/my-castings">Управление кастингами</a>
      </div>
      <hr className="hr" />

      {items.length === 0 ? (
        <p className="p" style={{textAlign:'center'}}>Пока нет кастингов. Создайте кастинг и вернитесь сюда для свайпов.</p>
      ) : (
        <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:12}}>
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

