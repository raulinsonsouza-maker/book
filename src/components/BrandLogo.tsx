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
  title?: string;
  subtitle?: string;
  logoUrl?: string | null;
  href?: string;
  className?: string;
  onClick?: () => void;
};

function LogoMark({
  size = "md",
  logoUrl,
}: {
  size?: Size;
  logoUrl?: string | null;
}) {
  const { box, px } = SIZES[size];
  const custom = Boolean(logoUrl?.trim());

  return (
    <span className={`${box} relative inline-flex shrink-0`}>
      {custom ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={logoUrl!}
          alt=""
          width={px}
          height={px}
          className="h-full w-full object-contain"
        />
      ) : (
        <Image
          src="/logo.png"
          alt=""
          width={px}
          height={px}
          className="h-full w-full object-contain"
          priority={size !== "sm"}
        />
      )}
    </span>
  );
}

export function BrandLogo({
  size = "md",
  showText = false,
  title = "Book Symbius",
  subtitle,
  logoUrl,
  href,
  className = "",
  onClick,
}: Props) {
  const content = (
    <>
      <LogoMark size={size} logoUrl={logoUrl} />
      {showText && (
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold tracking-tight text-foreground">
            {title}
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
