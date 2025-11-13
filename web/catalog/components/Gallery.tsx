// web/catalog/components/Gallery.tsx
"use client";

import React, { useMemo, useState, useCallback, useEffect } from "react";
import ImageLightbox from "./ImageLightbox";
import { photoUrl } from "../lib/media";

export default function Gallery({ userId, name, layout }: { userId: number; name: string; layout?: 'grid' | 'featured' }) {
  const srcs = useMemo(() => [1, 2, 3, 4].map((n) => photoUrl(userId, n as 1 | 2 | 3 | 4)), [userId]);
  const [validSrcs, setValidSrcs] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [idx, setIdx] = useState(0);

  const openAt = useCallback((i: number) => { setIdx(i); setOpen(true); }, []);
  const next = useCallback(() => setIdx((i) => (i + 1) % Math.max(validSrcs.length, 1)), [validSrcs.length]);
  const prev = useCallback(() => setIdx((i) => (i - 1 + Math.max(validSrcs.length, 1)) % Math.max(validSrcs.length, 1)), [validSrcs.length]);

  const downloadAll = useCallback(async () => {
    const list = validSrcs;
    for (let i = 0; i < list.length; i++) {
      await new Promise<void>((resolve) => {
        const a = document.createElement("a");
        a.href = list[i];
        a.download = `${userId}_photo_${i + 1}`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => resolve(), 150);
      });
    }
  }, [validSrcs, userId]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const results: string[] = [];
      await Promise.all(srcs.map((s) => new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => { results.push(s); resolve(); };
        img.onerror = () => { resolve(); };
        img.src = s;
      })));
      if (alive) setValidSrcs(results);
    })();
    return () => { alive = false; };
  }, [srcs]);

  return (
    <div>
      {validSrcs.length === 1 ? (
        <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 14 }}>
          <img
            key={validSrcs[0]}
            className="thumb"
            src={validSrcs[0]}
            alt={`${name || "Актёр"} фото 1`}
            loading="lazy"
            onClick={() => openAt(0)}
            style={{ cursor: "zoom-in", width: '100%' }}
          />
        </div>
      ) : layout === 'featured' ? (
        <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 14, alignItems:'start' }}>
          <div style={{ width:'100%', height:'100%', maxHeight: 520, overflow:'hidden', borderRadius:12 }}>
            <img
              key={validSrcs[0]}
              className="thumb"
              src={validSrcs[0]}
              alt={`${name || "Актёр"} фото 1`}
              loading="lazy"
              onClick={() => openAt(0)}
              style={{ cursor: "zoom-in", width:'100%', height:'100%', objectFit:'cover' }}
            />
          </div>
          <div className="grid" style={{ gridTemplateColumns: "1fr", gap: 10 }}>
            {validSrcs.slice(1).map((s, idx) => (
              <div key={s} style={{ width:'100%', height:120, overflow:'hidden', borderRadius:12 }}>
                <img
                  className="thumb"
                  src={s}
                  alt={`${name || "Актёр"} фото ${idx + 2}`}
                  loading="lazy"
                  onClick={() => openAt(idx + 1)}
                  style={{ cursor: "zoom-in", width:'100%', height:'100%', objectFit:'cover' }}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="grid" style={{ gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {validSrcs.map((s, i) => (
            <img
              key={s}
              className="thumb"
              src={s}
              alt={`${name || "Актёр"} фото ${i + 1}`}
              loading="lazy"
              onClick={() => openAt(i)}
              style={{ cursor: "zoom-in" }}
            />
          ))}
        </div>
      )}

      {open && (
        <ImageLightbox
          srcs={validSrcs}
          altBase={name || "Актёр"}
          index={idx}
          onClose={() => setOpen(false)}
          onPrev={prev}
          onNext={next}
          onDownloadAll={downloadAll}
        />
      )}
    </div>
  );
}
