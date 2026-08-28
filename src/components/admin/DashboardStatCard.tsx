import Link from "next/link";

type Props = {
  title: string;
  value: number | string;
  href: string;
  hrefLabel: string;
  variant: "blue" | "pink" | "orange";
};

const VARIANTS = {
  blue: "from-[#1d6fd8] to-[#1558b0]",
  pink: "from-[#d946a8] to-[#be3d8f]",
  orange: "from-[#f97316] to-[#ea580c]",
};

export function DashboardStatCard({
  title,
  value,
  href,
  hrefLabel,
  variant,
}: Props) {
  return (
    <div
      className={`dashboard-stat-card relative overflow-hidden rounded-2xl bg-gradient-to-br ${VARIANTS[variant]} p-5 text-white shadow-md`}
    >
      <p className="text-sm font-medium text-white/90">{title}</p>
      <p className="mt-3 text-4xl font-bold tracking-tight">{value}</p>
      <Link
        href={href}
        className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-white/20 px-3 py-1.5 text-xs font-semibold backdrop-blur-sm transition hover:bg-white/30"
      >
        {hrefLabel}
        <span aria-hidden>→</span>
      </Link>
    </div>
  );
}
