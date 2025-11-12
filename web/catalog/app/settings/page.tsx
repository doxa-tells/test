// web/catalog/app/settings/page.tsx
"use client";
import React from "react";
import { api, bp } from "../../lib/http";

export default function SettingsPage() {
  async function logout() {
    const r = await fetch(api('/api/auth/logout'), { method:'POST' });
    if (r.ok) location.href = bp('/');
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
