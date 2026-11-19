import { getProductBrand } from "@/lib/product-brand";
import {
  detailBox,
  escapeHtml,
  renderEmailLayout,
  type EmailBrandId,
} from "@/lib/email/templates/layout";

export function professionalWelcomeEmail(params: {
  displayName: string;
  organizationName: string;
  email: string;
  temporaryPassword: string;
  serviceTitles: string[];
  loginUrl: string;
  brandId?: EmailBrandId;
}) {
  const brandId: EmailBrandId = params.brandId === "temark" ? "temark" : "book";
  const brand = getProductBrand(brandId);
  const services =
    params.serviceTitles.length > 0
      ? params.serviceTitles.join(", ")
      : "Nenhum serviço vinculado ainda";

  const body = `
    <p>Olá, ${escapeHtml(params.displayName)}.</p>
    <p>
      Sua conta de profissional em
      <strong>${escapeHtml(params.organizationName)}</strong>
      foi criada no ${escapeHtml(brand.name)}.
    </p>
    ${detailBox([
      { label: "E-mail (login)", value: params.email },
      { label: "Senha inicial", value: params.temporaryPassword },
      { label: "Serviços", value: services },
    ])}
    <p style="color:#555;font-size:14px">
      No primeiro acesso pediremos que você cadastre uma senha nova.
      Guarde este e-mail até concluir o acesso.
    </p>
  `;

  return {
    subject: `Acesso profissional — ${params.organizationName}`,
    brandId,
    html: renderEmailLayout({
      title: "Sua conta foi criada",
      preheader: `Acesse a área de profissionais de ${params.organizationName}`,
      bodyHtml: body,
      brandId,
      origin: brand.appOrigin,
      cta: { label: "Acessar painel", href: params.loginUrl },
    }),
  };
}

export function passwordResetEmail(params: {
  name: string;
  resetUrl: string;
  brandId?: EmailBrandId;
}) {
  const brandId: EmailBrandId = params.brandId === "temark" ? "temark" : "book";
  const brand = getProductBrand(brandId);
  const body = `
    <p>Olá${params.name ? `, ${escapeHtml(params.name)}` : ""}.</p>
    <p>
      Recebemos um pedido para redefinir a senha da sua conta no ${escapeHtml(brand.name)}.
      O link é válido por 1 hora.
    </p>
    <p style="color:#555;font-size:14px">
      Se você não pediu isso, ignore este e-mail — sua senha permanece a mesma.
    </p>
  `;

  return {
    subject: `Redefinir senha — ${brand.name}`,
    brandId,
    html: renderEmailLayout({
      title: "Redefinir senha",
      preheader: "Crie uma nova senha para acessar o sistema",
      bodyHtml: body,
      brandId,
      origin: brand.appOrigin,
      cta: { label: "Cadastrar nova senha", href: params.resetUrl },
    }),
  };
}
