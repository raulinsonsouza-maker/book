import type { ReactNode } from "react";
import Link from "next/link";

type Props = {
  /** Texto de apoio abaixo do título do AppShell. */
  children: ReactNode;
  /** CTA principal (criar / novo) — fica sempre no canto superior direito. */
  action?: ReactNode;
  /** Link secundário sob a descrição (ex.: Páginas →). */
  link?: { href: string; label: string };
  className?: string;
};

/**
 * Cabeçalho padrão das listas do painel:
 * descrição à esquerda, botão de ação à direita (mesmo quando quebra linha).
 */
export function AdminPageHeader({
  children,
  action,
  link,
  className = "",
}: Props) {
  return (
    <div className={`admin-page-header ${className}`.trim()}>
      <div className="admin-page-header-copy">
        <p className="admin-page-header-desc">{children}</p>
        {link ? (
          <Link href={link.href} className="admin-page-header-link">
            {link.label}
          </Link>
        ) : null}
      </div>
      {action ? (
        <div className="admin-page-header-action">{action}</div>
      ) : null}
    </div>
  );
}
