"use client";

import { useEffect } from "react";
import {
  initPublicTracking,
  type PublicTrackingConfig,
} from "@/lib/tracking/client";

type Props = {
  config: PublicTrackingConfig;
};

/** Carrega Pixel/gtag e captura click IDs nas páginas públicas. */
export function PublicTracking({ config }: Props) {
  useEffect(() => {
    if (!config.metaPixelId && !config.googleAdsSendTo) return;
    initPublicTracking(config);
  }, [config.metaPixelId, config.googleAdsSendTo]);

  return null;
}
