import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(2).optional(),
  timezone: z.string().optional(),
  caktoClientId: z.string().nullable().optional(),
  caktoClientSecret: z.string().nullable().optional(),
  caktoSdkClientId: z.string().nullable().optional(),
  caktoOfferId: z.string().nullable().optional(),
});

function serializeOrg(org: {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  caktoClientId: string | null;
  caktoSdkClientId: string | null;
  caktoClientSecret: string | null;
  caktoOfferId: string | null;
}) {
  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    timezone: org.timezone,
    caktoClientId: org.caktoClientId,
    caktoSdkClientId: org.caktoSdkClientId,
    caktoOfferId: org.caktoOfferId,
    hasCaktoSecret: Boolean(org.caktoClientSecret),
    caktoConnected: Boolean(
      org.caktoClientId && org.caktoClientSecret && org.caktoOfferId,
    ),
  };
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId },
  });
  if (!org) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(serializeOrg(org));
}

export async function PATCH(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const raw = await req.json();
    const body = schema.parse(raw);
    const data: Record<string, unknown> = {};

    if (body.name !== undefined) data.name = body.name;
    if (body.timezone !== undefined) data.timezone = body.timezone;

    if ("caktoClientId" in raw) {
      const id =
        typeof body.caktoClientId === "string"
          ? body.caktoClientId.trim() || null
          : null;
      data.caktoClientId = id;
      data.caktoSdkClientId = id;
    }
    if ("caktoClientSecret" in raw) {
      data.caktoClientSecret =
        typeof body.caktoClientSecret === "string"
          ? body.caktoClientSecret.trim() || null
          : null;
    }
    if ("caktoOfferId" in raw) {
      data.caktoOfferId =
        typeof body.caktoOfferId === "string"
          ? body.caktoOfferId.trim() || null
          : null;
    }
    if ("caktoSdkClientId" in raw && !("caktoClientId" in raw)) {
      data.caktoSdkClientId =
        typeof body.caktoSdkClientId === "string"
          ? body.caktoSdkClientId.trim() || null
          : null;
    }

    const org = await prisma.organization.update({
      where: { id: session.user.organizationId },
      data,
    });
    return NextResponse.json(serializeOrg(org));
  } catch {
    return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
  }
}
