// web/catalog/app/settings/page.tsx
"use client";
import React from "react";

export default function SettingsPage() {
  async function logout() {
    const r = await fetch('/api/auth/logout', { method:'POST' });
    if (r.ok) location.href = '/';
  }

  return (
    <div style={{maxWidth:780, margin:'0 auto'}}>
      <div className="row" style={{justifyContent:'center'}}>
        <h1 className="h1" style={{textAlign:'center'}}>Настройки</h1>
      </div>
      <hr className="hr" />
      <div className="row" style={{justifyContent:'center'}}>
        <button className="btn btn--ghost" onClick={logout}>Выйти</button>
      </div>
    </div>
  );
}
