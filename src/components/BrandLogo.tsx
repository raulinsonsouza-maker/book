import Image from "next/image";
import Link from "next/link";

const SIZES = {
  sm: { box: "h-6 w-6", px: 24, title: "text-sm" },
  md: { box: "h-9 w-9", px: 36, title: "text-base" },
  lg: { box: "h-10 w-10", px: 40, title: "text-lg" },
} as const;

type Size = keyof typeof SIZES;

type Props = {
  size?: Size;
  showText?: boolean;
  title?: string;
  subtitle?: string;
  logoUrl?: string | null;
  /** Use white mark on dark backgrounds */
  light?: boolean;
  href?: string;
  className?: string;
  onClick?: () => void;
};

function LogoMark({
  size = "md",
  logoUrl,
  light = false,
}: {
  size?: Size;
  logoUrl?: string | null;
  light?: boolean;
}) {
  const { box, px } = SIZES[size];
  const custom = Boolean(logoUrl?.trim());
  const src = custom ? logoUrl! : light ? "/logo-white.png" : "/logo.png";

  return (
    <span className={`${box} relative inline-flex shrink-0`}>
      {custom ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          width={px}
          height={px}
          className="h-full w-full object-contain"
        />
      ) : (
        <Image
          src={src}
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
  light = false,
  href,
  className = "",
  onClick,
}: Props) {
  const content = (
    <>
      <LogoMark size={size} logoUrl={logoUrl} light={light} />
      {showText && (
        <span className="min-w-0">
          <span
            className={`block truncate font-semibold tracking-tight ${
              light ? "text-white" : "text-foreground"
            } ${SIZES[size].title}`}
          >
            {title}
          </span>
          {subtitle && (
            <span
              className={`block truncate text-[11px] ${
                light ? "text-white/65" : "text-muted"
              }`}
            >
              {subtitle}
            </span>
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
