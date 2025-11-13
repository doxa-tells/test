// web/catalog/app/embed/layout.tsx
import "../../app/globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Профиль актёра",
  description: "Встроенный просмотр профиля актёра",
};

export default function EmbedLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <div style={{maxWidth: 980, margin: '0 auto', padding: 12}}>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}
