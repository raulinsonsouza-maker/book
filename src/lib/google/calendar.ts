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

export type OrgGoogle = {
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

type EventPayload = {
  org: OrgGoogle;
  summary: string;
  description: string;
  startAt: Date;
  endAt: Date;
  timezone: string;
  attendeeEmail?: string;
  attendeeName?: string;
};

function buildEventBody(params: EventPayload) {
  return {
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
      ? [{ email: params.attendeeEmail, displayName: params.attendeeName }]
      : undefined,
    reminders: {
      useDefault: false,
      overrides: [
        { method: "email", minutes: 60 },
        { method: "popup", minutes: 30 },
      ],
    },
  };
}

export async function createCalendarEvent(params: EventPayload) {
  const auth = await getAuthedClient(params.org);
  const calendar = google.calendar({ version: "v3", auth });
  const calendarId = params.org.googleCalendarId || "primary";

  const event = await calendar.events.insert({
    calendarId,
    requestBody: buildEventBody(params),
    sendUpdates: params.attendeeEmail ? "all" : "none",
  });

  return event.data.id || null;
}

export async function updateCalendarEvent(
  params: EventPayload & { eventId: string },
) {
  const auth = await getAuthedClient(params.org);
  const calendar = google.calendar({ version: "v3", auth });
  const calendarId = params.org.googleCalendarId || "primary";

  const event = await calendar.events.update({
    calendarId,
    eventId: params.eventId,
    requestBody: buildEventBody(params),
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

export type GoogleCalendarEventItem = {
  id: string;
  summary: string;
  start: Date;
  end: Date;
  htmlLink: string | null;
};

export async function getGoogleCalendarEvents(params: {
  org: OrgGoogle;
  timeMin: Date;
  timeMax: Date;
}): Promise<GoogleCalendarEventItem[]> {
  if (!params.org.googleRefreshToken && !params.org.googleAccessToken) {
    return [];
  }

  try {
    const auth = await getAuthedClient(params.org);
    const calendar = google.calendar({ version: "v3", auth });
    const calendarId = params.org.googleCalendarId || "primary";

    const res = await calendar.events.list({
      calendarId,
      timeMin: params.timeMin.toISOString(),
      timeMax: params.timeMax.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
    });

    const items: GoogleCalendarEventItem[] = [];
    for (const ev of res.data.items || []) {
      if (!ev.start?.dateTime || !ev.end?.dateTime || !ev.id) continue;
      items.push({
        id: ev.id,
        summary: ev.summary || "(Sem título)",
        start: new Date(ev.start.dateTime),
        end: new Date(ev.end.dateTime),
        htmlLink: ev.htmlLink || null,
      });
    }
    return items;
  } catch (e) {
    console.warn("[google] events.list failed", e);
    return [];
  }
}

function formatBookingDescription(booking: {
  id: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerCpf: string | null;
  customAnswers: string | null;
  service: { title: string };
  bookingPage: { title: string };
}) {
  const lines = [
    `Cliente: ${booking.customerName}`,
    `E-mail: ${booking.customerEmail}`,
    `Telefone: ${booking.customerPhone}`,
  ];
  if (booking.customerCpf) lines.push(`CPF: ${booking.customerCpf}`);
  lines.push(`Serviço: ${booking.service.title}`);
  lines.push(`Página: ${booking.bookingPage.title}`);

  if (booking.customAnswers) {
    try {
      const answers = JSON.parse(booking.customAnswers) as Record<string, string>;
      lines.push("---");
      for (const [k, v] of Object.entries(answers)) {
        lines.push(`${k}: ${v}`);
      }
    } catch {
      lines.push(`Respostas: ${booking.customAnswers}`);
    }
  }

  const base =
    process.env.NEXTAUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://book.symbius.com.br";
  lines.push(`---`, `Booking ID: ${booking.id}`, `Admin: ${base}/app/agenda/listagem`);

  return lines.join("\n");
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

  const payload = {
    org,
    summary: `${booking.service.title} — ${booking.customerName}`,
    description: formatBookingDescription(booking),
    startAt: booking.startAt,
    endAt: booking.endAt,
    timezone: booking.timezone,
    attendeeEmail: booking.customerEmail,
    attendeeName: booking.customerName,
  };

  try {
    let eventId = booking.googleEventId;
    if (eventId) {
      await updateCalendarEvent({ ...payload, eventId });
    } else {
      eventId = await createCalendarEvent(payload);
      if (eventId) {
        await prisma.booking.update({
          where: { id: booking.id },
          data: { googleEventId: eventId },
        });
      }
    }
    return eventId;
  } catch (e) {
    console.error("[google] sync booking failed", e);
    return null;
  }
}
