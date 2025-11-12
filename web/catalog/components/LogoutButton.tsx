// web/catalog/components/LogoutButton.tsx
"use client";
import { api, bp } from "../lib/http";

export default function LogoutButton() {
  async function logout() {
    const r = await fetch(api('/api/auth/logout'), { method:'POST' });
    if (r.ok) location.href = bp('/');
  }
  return (
    <button className="btn btn--ghost" onClick={logout}>Выйти</button>
  );
}
