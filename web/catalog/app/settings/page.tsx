// web/catalog/app/settings/page.tsx
import { ensureTables, query } from "../../lib/db";
import React from "react";
import { currentUser } from "../../lib/auth";
import LogoutButton from "../../components/LogoutButton";
import SettingsAvatarBlock from "../../components/SettingsAvatarBlock";
import SettingsCompanyBlock from "../../components/SettingsCompanyBlock";
import SettingsAccountBlock from "../../components/SettingsAccountBlock";
import SettingsRightPane from "../../components/SettingsRightPane";
// Предпочтения убраны по требованиям заказчика

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
    <div style={{maxWidth:1100, margin:'0 auto'}}>
      <div className="row" style={{justifyContent:'space-between', alignItems:'end', gap:12}}>
        <div>
          <h1 className="h1">Настройки</h1>
          <p className="p" style={{color:'#9aa0a6', marginTop:4}}>Управляйте аккаунтом и данными профиля кастинг‑директора.</p>
        </div>
      </div>
      <hr className="hr" />

      <div className="grid" style={{gridTemplateColumns:'280px 1fr', gap:24, alignItems:'start'}}>
        {/* Навигация слева */}
        <aside className="card" style={{position:'sticky', top:16}}>
          <nav className="cardBody" aria-label="Навигация по настройкам">
            <a className="btn btn--ghost" href="#account" style={{width:'100%', justifyContent:'flex-start'}}>Аккаунт</a>
            <a className="btn btn--ghost" href="#avatar" style={{width:'100%', justifyContent:'flex-start'}}>Аватар</a>
            <a className="btn btn--ghost" href="#company" style={{width:'100%', justifyContent:'flex-start'}}>Компания</a>
            <a className="btn btn--ghost" href="#projects" style={{width:'100%', justifyContent:'flex-start'}}>Проекты</a>
          </nav>
        </aside>

        {/* Контент справа — табы по хэшу */}
        <div style={{width:'100%'}}>
          <SettingsRightPane userEmail={user.email} userCreatedAt={user.created_at} />
        </div>
      </div>
    </div>
  );
}
