import Image from "next/image";

type MetaIconProps = {
  className?: string;
  size?: number;
};

export function MetaIcon({ className = "", size = 40 }: MetaIconProps) {
  return (
    <Image
      src="/meta-logo.png"
      alt="Meta"
      width={size}
      height={size}
      className={className}
    />
  );
}
