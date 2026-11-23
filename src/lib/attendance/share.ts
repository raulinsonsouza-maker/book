import { randomBytes } from "crypto";
import { appUrl } from "@/lib/email/templates/layout";

export function newDocumentShareToken() {
  return randomBytes(24).toString("hex");
}

export function documentPublicUrl(token: string) {
  return appUrl(`/d/${token}`);
}

export function documentPublicPath(token: string) {
  return `/d/${token}`;
}
