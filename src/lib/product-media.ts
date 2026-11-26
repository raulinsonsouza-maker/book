export const MAX_PRODUCT_IMAGES = 5;
export const PRODUCT_IMAGE_PREFIX = "/uploads/products/";

export type CheckoutMediaItem =
  | { type: "image"; src: string }
  | { type: "video"; src: string; embedUrl: string | null };

const HEX_FULL = /^#[0-9A-Fa-f]{6}$/;
const HEX_SHORT = /^#[0-9A-Fa-f]{3}$/;

const VIDEO_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "vimeo.com",
  "www.vimeo.com",
  "player.vimeo.com",
]);

export function normalizeBackgroundColor(color?: string | null): string | null {
  const c = (color || "").trim();
  if (!c) return null;
  if (HEX_FULL.test(c)) return c.toLowerCase();
  if (HEX_SHORT.test(c)) {
    return `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}`.toLowerCase();
  }
  return null;
}

/** Relative luminance 0–1 (sRGB). */
export function backgroundLuminance(hex: string): number {
  const normalized = normalizeBackgroundColor(hex);
  if (!normalized) return 1;
  const r = parseInt(normalized.slice(1, 3), 16) / 255;
  const g = parseInt(normalized.slice(3, 5), 16) / 255;
  const b = parseInt(normalized.slice(5, 7), 16) / 255;
  const lin = (c: number) =>
    c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** `light` = fundo escuro → texto claro no header. */
export function checkoutHeaderTone(
  backgroundColor?: string | null,
): "dark" | "light" {
  const bg = normalizeBackgroundColor(backgroundColor);
  if (!bg) return "dark";
  return backgroundLuminance(bg) < 0.55 ? "light" : "dark";
}

export function parseProductImageUrls(raw?: string | null): string[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((u): u is string => typeof u === "string")
      .map((u) => u.trim())
      .filter((u) => u.startsWith(PRODUCT_IMAGE_PREFIX) && !u.includes(".."))
      .slice(0, MAX_PRODUCT_IMAGES);
  } catch {
    return [];
  }
}

export function serializeProductImageUrls(urls: string[]): string | null {
  const clean = urls
    .map((u) => u.trim())
    .filter((u) => u.startsWith(PRODUCT_IMAGE_PREFIX) && !u.includes(".."))
    .slice(0, MAX_PRODUCT_IMAGES);
  return clean.length ? JSON.stringify(clean) : null;
}

function youtubeEmbedId(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (host === "youtu.be" || host === "www.youtu.be") {
    const id = url.pathname.split("/").filter(Boolean)[0];
    return id || null;
  }
  if (host.includes("youtube.com")) {
    if (url.pathname.startsWith("/embed/")) {
      return url.pathname.split("/")[2] || null;
    }
    if (url.pathname.startsWith("/shorts/")) {
      return url.pathname.split("/")[2] || null;
    }
    return url.searchParams.get("v");
  }
  return null;
}

function vimeoEmbedId(url: URL): string | null {
  const host = url.hostname.toLowerCase();
  if (host === "player.vimeo.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[0] === "video" ? parts[1] || null : null;
  }
  if (host === "vimeo.com" || host === "www.vimeo.com") {
    const parts = url.pathname.split("/").filter(Boolean);
    const id = parts.find((p) => /^\d+$/.test(p));
    return id || null;
  }
  return null;
}

export function videoEmbedUrl(src: string): string | null {
  try {
    const url = new URL(src);
    if (url.protocol !== "https:") return null;
    const yt = youtubeEmbedId(url);
    if (yt) return `https://www.youtube.com/embed/${yt}`;
    const vim = vimeoEmbedId(url);
    if (vim) return `https://player.vimeo.com/video/${vim}`;
    return null;
  } catch {
    return null;
  }
}

export function parseVideoUrl(raw?: string | null): string | null {
  const c = (raw || "").trim();
  if (!c) return null;
  let url: URL;
  try {
    url = new URL(c);
  } catch {
    return null;
  }
  if (url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase();
  if (VIDEO_HOSTS.has(host)) {
    const embed = videoEmbedUrl(url.toString());
    return embed ? url.toString() : null;
  }

  const path = url.pathname.toLowerCase();
  if (path.endsWith(".mp4") || path.endsWith(".webm")) {
    return url.toString();
  }
  return null;
}

export function buildCheckoutMediaItems(
  images: string[],
  videoUrl?: string | null,
): CheckoutMediaItem[] {
  const items: CheckoutMediaItem[] = images.map((src) => ({
    type: "image" as const,
    src,
  }));
  const video = parseVideoUrl(videoUrl);
  if (video) {
    const path = (() => {
      try {
        return new URL(video).pathname.toLowerCase();
      } catch {
        return "";
      }
    })();
    const isFile = path.endsWith(".mp4") || path.endsWith(".webm");
    items.push({
      type: "video",
      src: video,
      embedUrl: isFile ? null : videoEmbedUrl(video),
    });
  }
  return items;
}

export function productImageFilename(url: string): string | null {
  if (!url.startsWith(PRODUCT_IMAGE_PREFIX)) return null;
  const name = url.slice(PRODUCT_IMAGE_PREFIX.length);
  if (!name || name.includes("..") || name.includes("/") || name.includes("\\")) {
    return null;
  }
  return name;
}
