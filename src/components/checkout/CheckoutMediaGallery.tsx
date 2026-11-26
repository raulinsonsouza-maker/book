"use client";

import { useCallback, useEffect, useState } from "react";
import type { CheckoutMediaItem } from "@/lib/product-media";

function MediaSlide({
  item,
  active,
}: {
  item: CheckoutMediaItem;
  active: boolean;
}) {
  if (item.type === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.src}
        alt=""
        className="h-full w-full object-cover"
        loading={active ? "eager" : "lazy"}
      />
    );
  }

  if (item.embedUrl) {
    if (!active) {
      return <div className="h-full w-full bg-black/5" aria-hidden />;
    }
    return (
      <iframe
        src={item.embedUrl}
        title="Vídeo do produto"
        className="h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    );
  }

  return (
    <video
      src={item.src}
      controls
      playsInline
      preload="metadata"
      className="h-full w-full object-contain bg-black"
    />
  );
}

export function CheckoutMediaGallery({ items }: { items: CheckoutMediaItem[] }) {
  const [index, setIndex] = useState(0);
  const count = items.length;

  useEffect(() => {
    setIndex(0);
  }, [items]);

  const go = useCallback(
    (dir: -1 | 1) => {
      if (count < 2) return;
      setIndex((i) => (i + dir + count) % count);
    },
    [count],
  );

  useEffect(() => {
    if (count < 2) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") go(-1);
      if (e.key === "ArrowRight") go(1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count, go]);

  if (count === 0) return null;

  const current = items[index] ?? items[0]!;
  const isGallery = count > 1;

  return (
    <div
      className="checkout-media mx-auto mt-4 w-full max-w-sm"
      role={isGallery ? "region" : undefined}
      aria-roledescription={isGallery ? "carousel" : undefined}
      aria-label={isGallery ? "Galeria do produto" : undefined}
    >
      <div className="checkout-media-frame relative aspect-[4/3] overflow-hidden rounded-2xl border border-border bg-muted-bg">
        <MediaSlide item={current} active />
        {isGallery ? (
          <>
            <button
              type="button"
              className="checkout-media-nav absolute left-2 top-1/2 -translate-y-1/2"
              aria-label="Anterior"
              onClick={() => go(-1)}
            >
              ‹
            </button>
            <button
              type="button"
              className="checkout-media-nav absolute right-2 top-1/2 -translate-y-1/2"
              aria-label="Próximo"
              onClick={() => go(1)}
            >
              ›
            </button>
          </>
        ) : null}
      </div>
      {isGallery ? (
        <div className="mt-2.5 flex items-center justify-center gap-1.5" role="tablist">
          {items.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Item ${i + 1}`}
              className={`checkout-media-dot ${i === index ? "is-active" : ""}`}
              onClick={() => setIndex(i)}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
