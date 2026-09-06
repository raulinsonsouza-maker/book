import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendProfessionalWelcome } from "@/lib/email";
import { appUrl } from "@/lib/email/templates/layout";
import { sendWhatsAppProfessionalInvite } from "@/lib/whatsapp/client";

/**
 * Após assinatura ativa: envia e-mail (e WhatsApp, se configurado)
 * com senha temporária e mustChangePassword.
 */
export async function inviteOnboardingProfessionals(organizationId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { name: true, businessMode: true },
  });
  if (!org || org.businessMode !== "SALON") return { sent: 0, whatsapp: 0 };

  const pros = await prisma.professional.findMany({
    where: { organizationId, isActive: true },
    include: {
      membership: { include: { user: true } },
      services: { include: { service: { select: { title: true } } } },
    },
    orderBy: { sortOrder: "asc" },
  });

  let sent = 0;
  let whatsapp = 0;
  for (const pro of pros) {
    const user = pro.membership.user;
    if (!user.email || user.email.endsWith("@book.local")) continue;
    if (!user.mustChangePassword) continue;

    const temporaryPassword = `BS-${Math.random().toString(36).slice(2, 10)}`;
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, mustChangePassword: true },
    });

    const serviceTitles = pro.services.map((s) => s.service.title);
    const loginUrl = appUrl("/login");

    try {
      await sendProfessionalWelcome({
        to: user.email,
        displayName: pro.displayName,
        organizationName: org.name,
        email: user.email,
        temporaryPassword,
        serviceTitles,
        loginUrl,
      });
      sent += 1;
    } catch (err) {
      console.error("[invite-professionals] email", user.email, err);
    }

    if (pro.phone) {
      try {
        const wa = await sendWhatsAppProfessionalInvite({
          toE164: pro.phone,
          organizationId,
          displayName: pro.displayName,
          organizationName: org.name,
          email: user.email,
          temporaryPassword,
        });
        if (wa.ok) whatsapp += 1;
        else if (!wa.skipped) {
          console.error(
            "[invite-professionals] whatsapp",
            pro.phone,
            wa.error,
          );
        }
      } catch (err) {
        console.error("[invite-professionals] whatsapp", pro.phone, err);
      }
    }
  }

  return { sent, whatsapp };
}
