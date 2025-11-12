// web/catalog/app/settings/page.tsx
import { ensureTables, query } from "../../lib/db";
import React from "react";
import { currentUser } from "../../lib/auth";
import LogoutButton from "../../components/LogoutButton";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  await ensureTables();
  const user = await currentUser();
  if (!user) {
    return (
      <div style={{maxWidth:780, margin:'0 auto'}}>
        <div className="row" style={{justifyContent:'center'}}>
          <h1 className="h1" style={{textAlign:'center'}}>Настройки</h1>
        </div>
        <p className="p" style={{textAlign:'center'}}>Войдите, чтобы видеть свои данные.</p>
      </div>
    );
  }

  const companies = await query(
    `SELECT name, role FROM companies WHERE user_id=$1 ORDER BY id ASC`,
    [user.id]
  );
  const company = companies[0] as { name?: string; role?: string } | undefined;

  return (
    <div style={{maxWidth:780, margin:'0 auto'}}>
      <div className="row" style={{justifyContent:'center'}}>
        <h1 className="h1" style={{textAlign:'center'}}>Настройки</h1>
      </div>
      <hr className="hr" />

      <div className="card" style={{marginTop:12}}>
        <div className="cardBody">
          <div className="h2" style={{marginBottom:8}}>Профиль</div>
          <div className="grid" style={{gridTemplateColumns:'1fr 2fr', gap:8}}>
            <div className="p" style={{color:'#6b7280'}}>Email</div>
            <div className="p">{user.email}</div>

            <div className="p" style={{color:'#6b7280'}}>Создан</div>
            <div className="p">{new Date(user.created_at).toLocaleString()}</div>

            <div className="p" style={{color:'#6b7280'}}>Компания</div>
            <div className="p">{company?.name || '—'}</div>

            <div className="p" style={{color:'#6b7280'}}>Роль</div>
            <div className="p">{company?.role || '—'}</div>
          </div>

          <div className="row" style={{justifyContent:'flex-end', marginTop:12}}>
            <LogoutButton />
          </div>
        </div>
      </div>

      {/* Блок проектов скрыт временно */}
    </div>
  );
}
