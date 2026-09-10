import { parseGoogleAdsTagId } from "@/lib/tracking/parse";
import {
  captureClickIds,
  clickIdsForPayload,
  getStoredClickIds,
} from "@/lib/tracking/click-ids";
import { hashPhoneBrowser, sha256Browser } from "@/lib/tracking/hash";

export type PublicTrackingConfig = {
  metaPixelId: string | null;
  googleAdsSendTo: string | null;
};

type UserData = {
  email?: string | null;
  phone?: string | null;
};

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
  }
}

let metaLoadedFor: string | null = null;
let googleLoadedFor: string | null = null;

function loadMetaPixel(pixelId: string) {
  if (typeof window === "undefined" || metaLoadedFor === pixelId) return;
  if (metaLoadedFor && metaLoadedFor !== pixelId) {
    metaLoadedFor = null;
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const w = window as any;
  if (!w.fbq) {
    const n: any = (w.fbq = function (...args: unknown[]) {
      n.callMethod ? n.callMethod(...args) : n.queue.push(args);
    });
    if (!w._fbq) w._fbq = n;
    n.push = n;
    n.loaded = true;
    n.version = "2.0";
    n.queue = [];
    const s = document.createElement("script");
    s.async = true;
    s.src = "https://connect.facebook.net/en_US/fbevents.js";
    const first = document.getElementsByTagName("script")[0];
    first?.parentNode?.insertBefore(s, first);
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */

  window.fbq?.("init", pixelId);
  window.fbq?.("track", "PageView");
  metaLoadedFor = pixelId;
}

function loadGoogleTag(sendTo: string) {
  const tagId = parseGoogleAdsTagId(sendTo);
  if (!tagId || typeof window === "undefined") return;
  if (googleLoadedFor === tagId) return;

  window.dataLayer = window.dataLayer || [];
  window.gtag =
    window.gtag ||
    function gtag(...args: unknown[]) {
      window.dataLayer?.push(args);
    };
  window.gtag("js", new Date());
  window.gtag("config", tagId);

  if (!document.querySelector(`script[data-google-ads="${tagId}"]`)) {
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(tagId)}`;
    s.dataset.googleAds = tagId;
    document.head.appendChild(s);
  }

  googleLoadedFor = tagId;
}

export function initPublicTracking(config: PublicTrackingConfig) {
  captureClickIds();
  if (config.metaPixelId) loadMetaPixel(config.metaPixelId);
  if (config.googleAdsSendTo) loadGoogleTag(config.googleAdsSendTo);
}

async function enhancedUserData(user?: UserData) {
  if (!user) return undefined;
  const out: Record<string, string> = {};
  if (user.email) {
    out.sha256_email_address = await sha256Browser(user.email);
  }
  if (user.phone) {
    const phoneHash = await hashPhoneBrowser(user.phone);
    if (phoneHash) out.sha256_phone_number = phoneHash;
  }
  return Object.keys(out).length ? out : undefined;
}

export async function trackPurchase(params: {
  eventId: string;
  valueCents: number;
  googleAdsSendTo?: string | null;
  metaPixelId?: string | null;
  user?: UserData;
}) {
  const value = Math.max(0, params.valueCents) / 100;
  const currency = "BRL";

  if (params.metaPixelId && window.fbq) {
    window.fbq("track", "Purchase", { value, currency }, { eventID: params.eventId });
  }

  if (params.googleAdsSendTo && window.gtag) {
    const user_data = await enhancedUserData(params.user);
    if (user_data) {
      window.gtag("set", "user_data", user_data);
    }
    window.gtag("event", "conversion", {
      send_to: params.googleAdsSendTo,
      value,
      currency,
      transaction_id: params.eventId,
    });
  }
}

export async function trackSchedule(params: {
  eventId: string;
  metaPixelId?: string | null;
  user?: UserData;
}) {
  if (params.metaPixelId && window.fbq) {
    window.fbq("track", "Schedule", {}, { eventID: params.eventId });
  }
}

export { clickIdsForPayload, getStoredClickIds, captureClickIds };
