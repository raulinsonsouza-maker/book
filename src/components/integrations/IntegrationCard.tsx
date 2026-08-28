type IntegrationCardProps = {
  icon: React.ReactNode;
  title: string;
  status: string;
  statusVariant: "connected" | "disconnected" | "demo";
  description: string;
  action: React.ReactNode;
};

export function IntegrationCard({
  icon,
  title,
  status,
  statusVariant,
  description,
  action,
}: IntegrationCardProps) {
  const statusClass =
    statusVariant === "connected"
      ? "!bg-emerald-50 !text-emerald-700"
      : statusVariant === "demo"
        ? "!bg-amber-50 !text-amber-800"
        : "!bg-muted-bg !text-muted";

  return (
    <div className="integration-card flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-border bg-white">
          {icon}
        </div>
        <span className={`tag shrink-0 ${statusClass}`}>{status}</span>
      </div>
      <h3 className="mt-4 text-base font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 flex-1 text-sm text-muted">{description}</p>
      <div className="mt-4">{action}</div>
    </div>
  );
}
