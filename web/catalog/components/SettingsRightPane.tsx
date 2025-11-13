// web/catalog/components/SettingsRightPane.tsx
"use client";
import React from "react";
import SettingsAccountBlock from "./SettingsAccountBlock";
import SettingsAvatarBlock from "./SettingsAvatarBlock";
import SettingsCompanyBlock from "./SettingsCompanyBlock";
import SettingsProjectsBlock from "./SettingsProjectsBlock";

export default function SettingsRightPane({ userEmail, userCreatedAt }: { userEmail: string; userCreatedAt: string; }) {
  const [tab, setTab] = React.useState<string>("account");
  const [currentEmail, setCurrentEmail] = React.useState<string>(userEmail);

  React.useEffect(() => {
    const get = () => {
      const h = (typeof window !== 'undefined' ? window.location.hash.replace('#','') : '') || 'account';
      setTab(h);
    };
    get();
    const onHash = () => get();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  return (
    <section className="grid" style={{gridTemplateColumns:'1fr', gap:20}}>
      {tab === 'account' && (
        <div id="account" className="card">
          <div className="cardBody">
            <div className="h2">Аккаунт</div>
            <p className="p" style={{color:'#6b7280'}}>Базовая информация и безопасность аккаунта.</p>
            <div className="grid" style={{gridTemplateColumns:'1fr 2fr', gap:8, marginTop:12}}>
              <div className="p" style={{color:'#6b7280'}}>Текущий email</div>
              <div className="p">{currentEmail}</div>
              <div className="p" style={{color:'#6b7280'}}>Создан</div>
              <div className="p">{new Date(userCreatedAt).toLocaleString()}</div>
            </div>
            <div style={{marginTop:16}}>
              <SettingsAccountBlock email={currentEmail} onEmailUpdated={(e)=>setCurrentEmail(e)} />
            </div>
          </div>
        </div>
      )}

      {tab === 'avatar' && (
        <div id="avatar" className="card">
          <div className="cardBody">
            <div className="h2" style={{marginBottom:4}}>Аватар</div>
            <p className="p" style={{color:'#6b7280', marginBottom:12}}>Загрузите логотип или фото для вашего профиля. Рекомендуемый размер 512×512.</p>
            <SettingsAvatarBlock />
          </div>
        </div>
      )}

      {tab === 'company' && (
        <div id="company" className="card">
          <div className="cardBody">
            <div className="h2" style={{marginBottom:4}}>Профиль</div>
            <p className="p" style={{color:'#6b7280', marginBottom:12}}>Название, роль и краткое описание для публичного профиля.</p>
            <SettingsCompanyBlock />
          </div>
        </div>
      )}

      {tab === 'projects' && (
        <div id="projects" className="card">
          <div className="cardBody">
            <div className="h2" style={{marginBottom:4}}>Проекты</div>
            <SettingsProjectsBlock />
          </div>
        </div>
      )}
    </section>
  );
}
