export const metadata = {
  title: process.env.SITE_NAME || "Roletapp AI by PVE",
  description: "Каталог актёров для кастинг-директоров"
};

import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const site = process.env.SITE_NAME || "Roletapp AI by PVE";
  return (
    <html lang="ru">
      <body>
        <div className="container">
          <header className="header">
            <div className="row">
              <div className="logo">{site}</div>
              <span className="badge">база актёров</span>
            </div>
            <a className="btn" href="/">Главная</a>
          </header>
          {children}
          <div className="footer">© {new Date().getFullYear()} {site}</div>
        </div>
      </body>
    </html>
  );
}