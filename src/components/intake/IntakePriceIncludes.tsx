/** Ciência do que já entra no valor da abertura de empresa. */
export function IntakePriceIncludes({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-border bg-muted-bg/60 px-4 py-3 text-sm ${className}`}
    >
      <p className="font-semibold text-foreground">Este valor já inclui</p>
      <ul className="mt-2 space-y-1.5 text-muted">
        <li className="flex gap-2">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/40" aria-hidden />
          Contrato social da junta comercial
        </li>
        <li className="flex gap-2">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/40" aria-hidden />
          Certificado digital
        </li>
        <li className="flex gap-2">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/40" aria-hidden />
          Taxas da junta comercial
        </li>
        <li className="flex gap-2">
          <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-foreground/40" aria-hidden />
          Serviço de abertura
        </li>
      </ul>
    </div>
  );
}
