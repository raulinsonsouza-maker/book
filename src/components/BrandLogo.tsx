import Image from "next/image";
import Link from "next/link";

const SIZES = {
  sm: { box: "h-6 w-6", px: 24 },
  md: { box: "h-9 w-9", px: 36 },
  lg: { box: "h-10 w-10", px: 40 },
} as const;

type Size = keyof typeof SIZES;

type Props = {
  size?: Size;
  showText?: boolean;
  subtitle?: string;
  href?: string;
  className?: string;
  onClick?: () => void;
};

function LogoMark({ size = "md" }: { size?: Size }) {
  const { box, px } = SIZES[size];

  return (
    <span
      className={`${box} relative inline-flex shrink-0 overflow-hidden rounded-lg bg-black`}
    >
      <Image
        src="/logo.png"
        alt=""
        width={px}
        height={px}
        className="h-full w-full object-contain"
        priority={size !== "sm"}
      />
    </span>
  );
}

export function BrandLogo({
  size = "md",
  showText = false,
  subtitle,
  href,
  className = "",
  onClick,
}: Props) {
  const content = (
    <>
      <LogoMark size={size} />
      {showText && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-tight text-foreground">
            Book Symbius
          </span>
          {subtitle && (
            <span className="block truncate text-[11px] text-muted">{subtitle}</span>
          )}
        </span>
      )}
    </>
  );

  const classes = `inline-flex min-w-0 items-center gap-2.5 ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return <span className={classes}>{content}</span>;
}
