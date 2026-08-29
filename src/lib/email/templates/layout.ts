const APP_URL = () =>
  (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || "https://book.symbius.com.br").replace(
    /\/$/,
    "",
  );

export function appUrl(path = "") {
  return `${APP_URL()}${path.startsWith("/") ? path : path ? `/${path}` : ""}`;
}

export function emailFrom() {
  return process.env.EMAIL_FROM || "Book Symbius <agendamento@book.symbius.com.br>";
}

type LayoutParams = {
  title: string;
  preheader?: string;
  bodyHtml: string;
  cta?: { label: string; href: string };
};

/** Layout padronizado Book Symbius — identidade do produto, conteúdo dinâmico no body. */
export function renderEmailLayout(params: LayoutParams) {
  const logo = appUrl("/logo.png");
  const privacy = appUrl("/privacidade");
  const terms = appUrl("/termos");
  const home = appUrl("/");
  const cta = params.cta
    ? `<p style="margin:28px 0 8px;text-align:center">
        <a href="${params.cta.href}" style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:10px">${params.cta.label}</a>
      </p>`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${escapeHtml(params.title)}</title>
  ${params.preheader ? `<span style="display:none!important;visibility:hidden;opacity:0;height:0;width:0;overflow:hidden">${escapeHtml(params.preheader)}</span>` : ""}
</head>
<body style="margin:0;padding:0;background:#f4f2ef;color:#1a1a1a">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2ef;padding:32px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e8e4de">
          <tr>
            <td style="padding:28px 28px 12px;text-align:center;border-bottom:1px solid #f0ece6">
              <img src="${logo}" alt="Book Symbius" width="140" height="auto" style="display:inline-block;max-width:140px;height:auto" />
            </td>
          </tr>
          <tr>
            <td style="padding:28px;font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:1.55;color:#1a1a1a">
              <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:22px;line-height:1.3;font-weight:700;margin:0 0 16px;color:#0a0a0a">${escapeHtml(params.title)}</h1>
              <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;line-height:1.6;color:#2a2a2a">
                ${params.bodyHtml}
              </div>
              ${cta}
            </td>
          </tr>
          <tr>
            <td style="padding:18px 28px 24px;background:#faf8f5;border-top:1px solid #f0ece6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;line-height:1.5;color:#777;text-align:center">
              Enviado por <a href="${home}" style="color:#0a0a0a;text-decoration:none;font-weight:600">Book Symbius</a><br />
              <a href="${privacy}" style="color:#777">Privacidade</a>
              &nbsp;·&nbsp;
              <a href="${terms}" style="color:#777">Termos</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function detailBox(rows: Array<{ label: string; value: string }>) {
  const lines = rows
    .filter((r) => r.value)
    .map(
      (r) =>
        `<tr>
          <td style="padding:8px 0;font-size:13px;color:#666;width:120px;vertical-align:top">${escapeHtml(r.label)}</td>
          <td style="padding:8px 0;font-size:14px;color:#0a0a0a;font-weight:500">${escapeHtml(r.value)}</td>
        </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f7f5f2;border-radius:12px;padding:4px 16px;margin:20px 0">${lines}</table>`;
}

export function escapeHtml(value: string) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatWhen(startAt: Date, endAt: Date, timezone: string) {
  // lazy import avoided — callers pass preformatted or use date helpers in email.ts
  return { startAt, endAt, timezone };
}
