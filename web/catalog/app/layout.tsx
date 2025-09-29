// web/catalog/app/layout.tsx
export const metadata = {
  title: process.env.SITE_NAME || "Roletapp AI by PVE",
  description: "Каталог актёров для кастинг-директоров",
};

import "./globals.css";
import Link from "next/link";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  const site = process.env.SITE_NAME || "Roletapp AI by PVE";
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
            </nav>
          </header>

          <main>{children}</main>

          <div className="footer">© {new Date().getFullYear()} {site}</div>
        </div>
      </body>
    </html>
  );
}