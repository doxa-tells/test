// web/catalog/components/ImageLightbox.tsx
"use client";

import React, { useEffect, useCallback } from "react";

export default function ImageLightbox({
  srcs,
  altBase,
  index,
  onClose,
  onPrev,
  onNext,
}: {
  srcs: string[];
  altBase: string;
  index: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    },
    [onClose, onPrev, onNext]
  );

  useEffect(() => {
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onKey]);

  const src = srcs[index];

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="lb_backdrop"
      onClick={onClose}
    >
      <div className="lb_body" onClick={(e) => e.stopPropagation()}>
        <button className="btn lb_close" type="button" onClick={onClose}>
          ✕
        </button>
        <button className="btn lb_nav lb_prev" type="button" onClick={onPrev}>
          ←
        </button>
        <img className="lb_img" src={src} alt={`${altBase}`} />
        <button className="btn lb_nav lb_next" type="button" onClick={onNext}>
          →
        </button>
        <div className="lb_actions">
          <a className="btn" href={src} download>
            Скачать
          </a>
        </div>
      </div>
      <style jsx>{`
        .lb_backdrop { position: fixed; inset: 0; background: rgba(0,0,0,.85); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .lb_body { position: relative; max-width: 92vw; max-height: 92vh; display: flex; align-items: center; justify-content: center; }
        .lb_img { max-width: 90vw; max-height: 80vh; object-fit: contain; box-shadow: 0 0 0 1px rgba(255,255,255,.1), 0 8px 40px rgba(0,0,0,.6); }
        .lb_close { position: absolute; top: -48px; right: 0; }
        .lb_nav { position: absolute; top: 50%; transform: translateY(-50%); opacity: .9; z-index: 1; }
        .lb_prev { left: 8px; }
        .lb_next { right: 8px; }
        .lb_actions { position: absolute; bottom: -56px; left: 0; right: 0; display: flex; justify-content: center; }
        @media (max-width: 640px) {
          .lb_prev { left: 8px; }
          .lb_next { right: 8px; }
          .lb_close { top: 8px; right: 8px; }
          .lb_actions { bottom: 8px; }
        }
      `}</style>
    </div>
  );
}
