// web/catalog/components/Gallery.tsx
"use client";

import React, { useMemo, useState, useCallback } from "react";
import ImageLightbox from "./ImageLightbox";
import { photoUrl } from "../lib/media";

export default function Gallery({ userId, name }: { userId: number; name: string }) {
  const srcs = useMemo(() => [1, 2, 3, 4].map((n) => photoUrl(userId, n as 1 | 2 | 3 | 4)), [userId]);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  const openAt = useCallback((i: number) => { setIdx(i); setOpen(true); }, []);
  const next = useCallback(() => setIdx((i) => (i + 1) % srcs.length), [srcs.length]);
  const prev = useCallback(() => setIdx((i) => (i - 1 + srcs.length) % srcs.length), [srcs.length]);

  const downloadAll = useCallback(async () => {
    for (let i = 0; i < srcs.length; i++) {
      await new Promise<void>((resolve) => {
        const a = document.createElement("a");
        a.href = srcs[i];
        a.download = `${userId}_photo_${i + 1}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => resolve(), 150);
      });
    }
  }, [srcs, userId]);

  return (
    <div>
      <div className="grid" style={{ gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        {srcs.map((s, i) => (
          <img
            key={i}
            className="thumb"
            src={s}
            alt={`${name || "Актёр"} фото ${i + 1}`}
            loading="lazy"
            onClick={() => openAt(i)}
            style={{ cursor: "zoom-in" }}
          />
        ))}
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
        <button className="btn" type="button" onClick={downloadAll}>Скачать все фото</button>
      </div>

      {open && (
        <ImageLightbox
          srcs={srcs}
          altBase={name || "Актёр"}
          index={idx}
          onClose={() => setOpen(false)}
          onPrev={prev}
          onNext={next}
        />
      )}
    </div>
  );
}
