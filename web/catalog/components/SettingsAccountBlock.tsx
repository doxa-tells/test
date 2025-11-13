// web/catalog/components/SettingsAccountBlock.tsx
"use client";
import React from "react";
import { api } from "../lib/http";

export default function SettingsAccountBlock({ email, onEmailUpdated }: { email: string; onEmailUpdated?: (email: string) => void }) {
  // Email change state
  const [newEmail, setNewEmail] = React.useState<string>("");
  const [curPassForEmail, setCurPassForEmail] = React.useState<string>("");
  const [savingEmail, setSavingEmail] = React.useState(false);
  const [emailMsg, setEmailMsg] = React.useState<string>("");

  // Password change state
  const [curPass, setCurPass] = React.useState<string>("");
  const [newPass, setNewPass] = React.useState<string>("");
  const [newPass2, setNewPass2] = React.useState<string>("");
  const [savingPass, setSavingPass] = React.useState(false);
  const [passMsg, setPassMsg] = React.useState<string>("");

  async function onChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (savingEmail) return;
    setSavingEmail(true); setEmailMsg("");
    try {
      const r = await fetch(api('/api/settings/account/email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_email: newEmail.trim(), current_password: curPassForEmail })
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        setEmailMsg('Email обновлён');
        if (onEmailUpdated && newEmail.trim()) onEmailUpdated(newEmail.trim());
        setNewEmail(""); setCurPassForEmail("");
      } else {
        setEmailMsg(d.error || 'Ошибка');
      }
    } catch { setEmailMsg('Ошибка сети'); }
    finally { setSavingEmail(false); }
  }

  async function onChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (savingPass) return;
    if (newPass !== newPass2) { setPassMsg('Пароли не совпадают'); return; }
    if (newPass.length < 8) { setPassMsg('Минимум 8 символов'); return; }
    setSavingPass(true); setPassMsg("");
    try {
      const r = await fetch(api('/api/settings/account/password'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: curPass, new_password: newPass })
      });
      const d = await r.json();
      if (r.ok && d.ok) {
        setPassMsg('Пароль обновлён');
        setCurPass(""); setNewPass(""); setNewPass2("");
      } else {
        setPassMsg(d.error || 'Ошибка');
      }
    } catch { setPassMsg('Ошибка сети'); }
    finally { setSavingPass(false); }
  }

  return (
    <div className="grid" style={{gridTemplateColumns:'1fr', gap:20}}>
      {/* Email */}
      <div className="card">
        <div className="cardBody">
          <div className="h2" style={{marginBottom:4}}>Смена email</div>
          <p className="p" style={{color:'#6b7280', marginBottom:12}}>Текущий: <b>{email}</b></p>
          <form onSubmit={onChangeEmail} className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:10, alignItems:'center'}}>
            <label className="p" htmlFor="newEmail" style={{color:'#6b7280'}}>Новый email</label>
            <input id="newEmail" className="input" type="email" placeholder="you@example.com" value={newEmail} onChange={(e)=>setNewEmail(e.target.value)} required />
            <label className="p" htmlFor="curPassEmail" style={{color:'#6b7280'}}>Текущий пароль</label>
            <input id="curPassEmail" className="input" type="password" placeholder="••••••••" value={curPassForEmail} onChange={(e)=>setCurPassForEmail(e.target.value)} required />
            <div />
            <div className="row" style={{gap:8, justifyContent:'flex-end'}}>
              <button className="btn" type="submit" disabled={savingEmail || !newEmail.trim() || !curPassForEmail}>{savingEmail? 'Сохранение…' : 'Обновить email'}</button>
              {emailMsg && <span className="p" style={{opacity:.9}}>{emailMsg}</span>}
            </div>
          </form>
        </div>
      </div>

      {/* Password */}
      <div className="card">
        <div className="cardBody">
          <div className="h2" style={{marginBottom:4}}>Смена пароля</div>
          <form onSubmit={onChangePassword} className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:10, alignItems:'center'}}>
            <label className="p" htmlFor="curPass" style={{color:'#6b7280'}}>Текущий пароль</label>
            <input id="curPass" className="input" type="password" placeholder="••••••••" value={curPass} onChange={(e)=>setCurPass(e.target.value)} required />
            <label className="p" htmlFor="newPass" style={{color:'#6b7280'}}>Новый пароль</label>
            <input id="newPass" className="input" type="password" placeholder="Минимум 8 символов" value={newPass} onChange={(e)=>setNewPass(e.target.value)} required />
            <label className="p" htmlFor="newPass2" style={{color:'#6b7280'}}>Повтор пароля</label>
            <input id="newPass2" className="input" type="password" placeholder="Повторите новый пароль" value={newPass2} onChange={(e)=>setNewPass2(e.target.value)} required />
            <div />
            <div className="row" style={{gap:8, justifyContent:'flex-end'}}>
              <button className="btn" type="submit" disabled={savingPass}>{savingPass? 'Сохранение…' : 'Обновить пароль'}</button>
              {passMsg && <span className="p" style={{opacity:.9}}>{passMsg}</span>}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
