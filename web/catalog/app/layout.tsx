// web/catalog/app/layout.tsx
export const metadata = {
  title: process.env.SITE_NAME || "CasterAI",
  description: "Каталог актёров для кастинг-директоров",
};

import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";

import { currentUser } from "../lib/auth";

export default async function RootLayout({ children }: { children: ReactNode }) {
  const site = process.env.SITE_NAME || "CasterAI";
  const user = await currentUser();
  return (
    <html lang="ru">
      <body>
        <div className="container">
          <header className="header">
            <div className="row">
              <Link href="/" className="logo">{site}</Link>
              <span className="badge">база актёров</span>
            </div>

            <nav className="row" aria-label="Главная навигация">
              <Link className="muted" href="/partners">Партнёры</Link>
              <Link className="muted" href="/about">О нас</Link>
              <Link className="muted" href="/favorites">Моя подборка</Link>
              <Link className="muted" href="/my-castings">Мои кастинги</Link>
              {user ? (
                <Link className="muted" href="/settings">Настройки</Link>
              ) : (
                <Link className="muted" href="/login">Войти</Link>
              )}
            </nav>
          </header>

          <main>{children}</main>

          <div className="footer">© {new Date().getFullYear()} {site}</div>
        </div>
      </body>
    </html>
  );
}