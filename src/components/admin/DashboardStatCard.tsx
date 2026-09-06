import Link from "next/link";

type Props = {
  title: string;
  value: number | string;
  href: string;
  variant: "blue" | "pink" | "orange";
};

const VARIANTS = {
  blue: "from-[#1d6fd8] to-[#1558b0]",
  pink: "from-[#d946a8] to-[#be3d8f]",
  orange: "from-[#f97316] to-[#ea580c]",
};

export function DashboardStatCard({ title, value, href, variant }: Props) {
  return (
    <Link
      href={href}
      className={`dashboard-stat-card group relative block overflow-hidden rounded-xl bg-gradient-to-br ${VARIANTS[variant]} p-4 text-white shadow-sm transition hover:brightness-105`}
    >
      <p className="text-xs font-medium text-white/85">{title}</p>
      <p className="mt-1.5 text-3xl font-bold tracking-tight">{value}</p>
      <span
        className="absolute right-3 top-3 text-sm text-white/50 transition group-hover:translate-x-0.5 group-hover:text-white/90"
        aria-hidden
      >
        →
      </span>
    </Link>
  );
}
