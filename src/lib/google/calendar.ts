import { google } from "googleapis";
import { prisma } from "@/lib/prisma";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

export function googleConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
  );
}

export function getGoogleOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/google/callback`;

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID e GOOGLE_CLIENT_SECRET não configurados");
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

export function getGoogleAuthUrl(state: string) {
  const client = getGoogleOAuthClient();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES,
    state,
  });
}

export async function exchangeGoogleCode(code: string) {
  const client = getGoogleOAuthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const me = await oauth2.userinfo.get();

  return {
    accessToken: tokens.access_token || null,
    refreshToken: tokens.refresh_token || null,
    expiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
    email: me.data.email || null,
  };
}

type OrgGoogle = {
  id: string;
  googleAccessToken: string | null;
  googleRefreshToken: string | null;
  googleTokenExpiry: Date | null;
  googleCalendarId: string | null;
};

async function getAuthedClient(org: OrgGoogle) {
  if (!org.googleRefreshToken && !org.googleAccessToken) {
    throw new Error("Google Agenda não conectada");
  }

  const client = getGoogleOAuthClient();
  client.setCredentials({
    access_token: org.googleAccessToken || undefined,
    refresh_token: org.googleRefreshToken || undefined,
    expiry_date: org.googleTokenExpiry?.getTime(),
  });

  client.on("tokens", async (tokens) => {
    await prisma.organization.update({
      where: { id: org.id },
      data: {
        googleAccessToken: tokens.access_token || undefined,
        googleRefreshToken: tokens.refresh_token || undefined,
        googleTokenExpiry: tokens.expiry_date
          ? new Date(tokens.expiry_date)
          : undefined,
      },
    });
  });

  return client;
}

export async function createCalendarEvent(params: {
  org: OrgGoogle;
  summary: string;
  description: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
  attendeeEmail?: string;
  attendeeName?: string;
}) {
  const auth = await getAuthedClient(params.org);
  const calendar = google.calendar({ version: "v3", auth });
  const calendarId = params.org.googleCalendarId || "primary";

  const event = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: params.summary,
      description: params.description,
      start: {
        dateTime: params.startAt.toISOString(),
        timeZone: params.timezone,
      },
      end: {
        dateTime: params.endAt.toISOString(),
        timeZone: params.timezone,
      },
      attendees: params.attendeeEmail
        ? [
            {
              email: params.attendeeEmail,
              displayName: params.attendeeName,
            },
          ]
        : undefined,
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 60 },
          { method: "popup", minutes: 30 },
        ],
      },
    },
    sendUpdates: params.attendeeEmail ? "all" : "none",
  });

  return event.data.id || null;
}

export async function deleteCalendarEvent(params: {
  org: OrgGoogle;
  eventId: string;
}) {
  const auth = await getAuthedClient(params.org);
  const calendar = google.calendar({ version: "v3", auth });
  const calendarId = params.org.googleCalendarId || "primary";

  try {
    await calendar.events.delete({
      calendarId,
      eventId: params.eventId,
      sendUpdates: "all",
    });
  } catch (e) {
    console.warn("[google] delete event failed", e);
  }
}

export async function getGoogleBusyIntervals(params: {
  org: OrgGoogle;
  timeMin: Date;
  timeMax: Date;
}) {
  if (!params.org.googleRefreshToken && !params.org.googleAccessToken) {
    return [] as { start: Date; end: Date }[];
  }

  try {
    const auth = await getAuthedClient(params.org);
    const calendar = google.calendar({ version: "v3", auth });
    const calendarId = params.org.googleCalendarId || "primary";

    const res = await calendar.freebusy.query({
      requestBody: {
        timeMin: params.timeMin.toISOString(),
        timeMax: params.timeMax.toISOString(),
        items: [{ id: calendarId }],
      },
    });

    const busy = res.data.calendars?.[calendarId]?.busy || [];
    return busy
      .filter((b) => b.start && b.end)
      .map((b) => ({
        start: new Date(b.start!),
        end: new Date(b.end!),
      }));
  } catch (e) {
    console.warn("[google] freebusy failed", e);
    return [];
  }
}

export async function syncBookingToGoogle(bookingId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      service: true,
      bookingPage: { include: { organization: true } },
    },
  });
  if (!booking) return null;

  const org = booking.bookingPage.organization;
  if (!org.googleRefreshToken && !org.googleAccessToken) return null;
  if (booking.googleEventId) return booking.googleEventId;

  try {
    const eventId = await createCalendarEvent({
      org,
      summary: `${booking.service.title} — ${booking.customerName}`,
      description: [
        `Cliente: ${booking.customerName}`,
        `E-mail: ${booking.customerEmail}`,
        `Telefone: ${booking.customerPhone}`,
        `Serviço: ${booking.service.title}`,
        `Página: ${booking.bookingPage.title}`,
        `ID: ${booking.id}`,
      ].join("\n"),
      startAt: booking.startAt,
      endAt: booking.endAt,
      timezone: booking.timezone,
      attendeeEmail: booking.customerEmail,
      attendeeName: booking.customerName,
    });

    if (eventId) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: { googleEventId: eventId },
      });
    }
    return eventId;
  } catch (e) {
    console.error("[google] sync booking failed", e);
    return null;
  }
}
