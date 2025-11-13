// web/catalog/app/embed/layout.tsx
import "../globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Профиль актёра",
  description: "Встроенный просмотр профиля актёра",
};

export default function EmbedLayout({ children }: { children: ReactNode }) {
  return (
    <div style={{maxWidth: 980, margin: '0 auto', padding: 12}}>
      {/* Скрываем глобальные header/footer на встраиваемых страницах */}
      <style>{`.header, .footer { display:none !important }`}</style>
      {children}
    </div>
  );
}
