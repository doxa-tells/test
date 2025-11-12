// web/catalog/app/my-castings/page.tsx
import { ensureTables, listMyCastings } from "../../lib/db";
import { currentUser } from "../../lib/auth";
import { bp } from "../../lib/http";
import MyCastingsClient from "../../components/MyCastingsClient";

export const dynamic = "force-dynamic";

export default async function MyCastingsPage() {
  await ensureTables();
  const user = await currentUser();
  if (!user) {
    return (
      <div>
        <h1 className="h1">Мои кастинги</h1>
        <p className="p">Авторизуйтесь, чтобы продолжить.</p>
        <a className="btn" href={bp('/login')}>Войти</a>
      </div>
    );
  }

  const items = await listMyCastings(user.id);

  return (
    <div style={{maxWidth:900, margin:'0 auto'}}>
      <div className="row" style={{justifyContent:'center'}}>
        <h1 className="h1" style={{textAlign:'center'}}>Мои кастинги</h1>
      </div>
      <MyCastingsClient items={items} />
    </div>
  );
}
