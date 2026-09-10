import { prisma } from "@/lib/prisma";
import { hashEmail, hashPhone } from "@/lib/tracking/hash";
import { appUrl } from "@/lib/email/templates/layout";

type TrackingOrg = {
  metaPixelId: string | null;
  metaCapiAccessToken: string | null;
  slug?: string;
};

type UserPayload = {
  email?: string | null;
  phone?: string | null;
  fbc?: string | null;
  fbp?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
  eventSourceUrl?: string | null;
};

async function claimTrackingDedupe(params: {
  organizationId: string;
  bookingId?: string | null;
  type: string;
  dedupeKey: string;
}) {
  try {
    await prisma.bookingEventLog.create({
      data: {
        organizationId: params.organizationId,
        bookingId: params.bookingId || null,
        type: params.type,
        dedupeKey: params.dedupeKey,
      },
    });
    return true;
  } catch {
    return false;
  }
}

async function sendMetaCapi(params: {
  org: TrackingOrg;
  eventName: "Purchase" | "Schedule";
  eventId: string;
  valueCents?: number;
  user: UserPayload;
}) {
  const pixelId = params.org.metaPixelId;
  const token = params.org.metaCapiAccessToken;
  if (!pixelId || !token) return;

  const user_data: Record<string, unknown> = {};
  const em = hashEmail(params.user.email);
  const ph = hashPhone(params.user.phone);
  if (em) user_data.em = [em];
  if (ph) user_data.ph = [ph];
  if (params.user.fbc) user_data.fbc = params.user.fbc;
  if (params.user.fbp) user_data.fbp = params.user.fbp;
  if (params.user.clientIp) user_data.client_ip_address = params.user.clientIp;
  if (params.user.userAgent) user_data.client_user_agent = params.user.userAgent;

  const custom_data: Record<string, unknown> = {};
  if (params.eventName === "Purchase" && params.valueCents != null) {
    custom_data.value = Math.max(0, params.valueCents) / 100;
    custom_data.currency = "BRL";
  }

  const body = {
    data: [
      {
        event_name: params.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: params.eventId,
        event_source_url: params.user.eventSourceUrl || undefined,
        action_source: "website",
        user_data,
        ...(Object.keys(custom_data).length ? { custom_data } : {}),
      },
    ],
  };

  const url = `https://graph.facebook.com/v21.0/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    console.error("[tracking] Meta CAPI failed", res.status, text.slice(0, 300));
  }
}

export async function trackServerPurchase(params: {
  organizationId: string;
  org: TrackingOrg;
  eventId: string;
  valueCents: number;
  bookingId?: string | null;
  user: UserPayload;
}) {
  if (!params.org.metaPixelId || !params.org.metaCapiAccessToken) return;

  const claimed = await claimTrackingDedupe({
    organizationId: params.organizationId,
    bookingId: params.bookingId,
    type: "tracking.purchase",
    dedupeKey: `tracking:purchase:${params.eventId}`,
  });
  if (!claimed) return;

  try {
    await sendMetaCapi({
      org: params.org,
      eventName: "Purchase",
      eventId: params.eventId,
      valueCents: params.valueCents,
      user: params.user,
    });
  } catch (e) {
    console.error("[tracking] Purchase error", e);
  }
}

export async function trackServerSchedule(params: {
  organizationId: string;
  org: TrackingOrg;
  eventId: string;
  bookingId?: string | null;
  user: UserPayload;
}) {
  if (!params.org.metaPixelId || !params.org.metaCapiAccessToken) return;

  const claimed = await claimTrackingDedupe({
    organizationId: params.organizationId,
    bookingId: params.bookingId,
    type: "tracking.schedule",
    dedupeKey: `tracking:schedule:${params.eventId}`,
  });
  if (!claimed) return;

  try {
    await sendMetaCapi({
      org: params.org,
      eventName: "Schedule",
      eventId: params.eventId,
      user: params.user,
    });
  } catch (e) {
    console.error("[tracking] Schedule error", e);
  }
}

export function fireTrackingPurchase(...args: Parameters<typeof trackServerPurchase>) {
  void trackServerPurchase(...args);
}

export function fireTrackingSchedule(...args: Parameters<typeof trackServerSchedule>) {
  void trackServerSchedule(...args);
}

/** Purchase CAPI a partir de booking com payment PAID. */
export async function trackBookingPaidConversion(bookingId: string) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payment: true,
        bookingPage: {
          include: {
            organization: {
              select: {
                id: true,
                slug: true,
                metaPixelId: true,
                metaCapiAccessToken: true,
              },
            },
          },
        },
      },
    });
    if (!booking?.payment || booking.payment.status !== "PAID") return;
    const org = booking.bookingPage.organization;
    await trackServerPurchase({
      organizationId: org.id,
      org,
      eventId: booking.id,
      valueCents: booking.payment.amountCents,
      bookingId: booking.id,
      user: {
        email: booking.customerEmail,
        phone: booking.customerPhone,
        fbc: booking.fbc,
        fbp: booking.fbp,
        eventSourceUrl: `${appUrl()}/p/${org.slug}/${booking.bookingPage.slug}`,
      },
    });
  } catch (e) {
    console.error("[tracking] booking paid", e);
  }
}

export function fireBookingPaidConversion(bookingId: string) {
  void trackBookingPaidConversion(bookingId);
}

/** Schedule CAPI para booking confirmado sem pagamento. */
export async function trackBookingScheduleConversion(bookingId: string) {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        payment: true,
        bookingPage: {
          include: {
            organization: {
              select: {
                id: true,
                slug: true,
                metaPixelId: true,
                metaCapiAccessToken: true,
              },
            },
          },
        },
      },
    });
    if (!booking) return;
    if (booking.payment?.status === "PAID") return;
    const org = booking.bookingPage.organization;
    await trackServerSchedule({
      organizationId: org.id,
      org,
      eventId: booking.id,
      bookingId: booking.id,
      user: {
        email: booking.customerEmail,
        phone: booking.customerPhone,
        fbc: booking.fbc,
        fbp: booking.fbp,
        eventSourceUrl: `${appUrl()}/p/${org.slug}/${booking.bookingPage.slug}`,
      },
    });
  } catch (e) {
    console.error("[tracking] booking schedule", e);
  }
}

export function fireBookingScheduleConversion(bookingId: string) {
  void trackBookingScheduleConversion(bookingId);
}

/** Purchase CAPI a partir de checkout order pago. */
export async function trackCheckoutPaidConversion(orderId: string) {
  try {
    const order = await prisma.checkoutOrder.findUnique({
      where: { id: orderId },
      include: {
        payment: true,
        checkoutLink: true,
        product: {
          include: {
            organization: {
              select: {
                id: true,
                slug: true,
                metaPixelId: true,
                metaCapiAccessToken: true,
              },
            },
          },
        },
      },
    });
    if (!order || order.status !== "PAID") return;
    const org = order.product.organization;
    const eventId = order.id;
    const valueCents = order.payment?.amountCents ?? order.product.priceCents;
    await trackServerPurchase({
      organizationId: org.id,
      org,
      eventId,
      valueCents,
      user: {
        email: order.customerEmail,
        phone: order.customerPhone,
        fbc: order.fbc,
        fbp: order.fbp,
        eventSourceUrl: `${appUrl()}/pay/${order.checkoutLink.slug}`,
      },
    });
  } catch (e) {
    console.error("[tracking] checkout paid", e);
  }
}

export function fireCheckoutPaidConversion(orderId: string) {
  void trackCheckoutPaidConversion(orderId);
}
