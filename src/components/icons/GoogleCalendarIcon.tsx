import Image from "next/image";

type GoogleCalendarIconProps = {
  className?: string;
  size?: number;
};

export function GoogleCalendarIcon({
  className = "",
  size = 40,
}: GoogleCalendarIconProps) {
  return (
    <Image
      src="/google-calendar-logo.png"
      alt=""
      width={size}
      height={size}
      className={`mix-blend-lighten ${className}`.trim()}
      aria-hidden
    />
  );
}
