import Image from "next/image";

type AsaasIconProps = {
  className?: string;
  size?: number;
};

export function AsaasIcon({ className = "", size = 40 }: AsaasIconProps) {
  return (
    <Image
      src="/asaas.webp"
      alt="Asaas"
      width={size}
      height={size}
      className={`object-contain ${className}`}
    />
  );
}
