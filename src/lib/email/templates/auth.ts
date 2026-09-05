import {
  appUrl,
  detailBox,
  escapeHtml,
  renderEmailLayout,
} from "@/lib/email/templates/layout";

export function professionalWelcomeEmail(params: {
  displayName: string;
  organizationName: string;
  email: string;
  temporaryPassword: string;
  serviceTitles: string[];
  loginUrl: string;
}) {
  const services =
    params.serviceTitles.length > 0
      ? params.serviceTitles.join(", ")
      : "Nenhum serviço vinculado ainda";

  const body = `
    <p>Olá, ${escapeHtml(params.displayName)}.</p>
    <p>
      Sua conta de profissional em
      <strong>${escapeHtml(params.organizationName)}</strong>
      foi criada no Book Symbius.
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
    html: renderEmailLayout({
      title: "Sua conta foi criada",
      preheader: `Acesse a área de profissionais de ${params.organizationName}`,
      bodyHtml: body,
      cta: { label: "Acessar painel", href: params.loginUrl },
    }),
  };
}

export function passwordResetEmail(params: {
  name: string;
  resetUrl: string;
}) {
  const body = `
    <p>Olá${params.name ? `, ${escapeHtml(params.name)}` : ""}.</p>
    <p>
      Recebemos um pedido para redefinir a senha da sua conta no Book Symbius.
      O link é válido por 1 hora.
    </p>
    <p style="color:#555;font-size:14px">
      Se você não pediu isso, ignore este e-mail — sua senha permanece a mesma.
    </p>
  `;

  return {
    subject: "Redefinir senha — Book Symbius",
    html: renderEmailLayout({
      title: "Redefinir senha",
      preheader: "Crie uma nova senha para acessar o sistema",
      bodyHtml: body,
      cta: { label: "Cadastrar nova senha", href: params.resetUrl },
    }),
  };
}
