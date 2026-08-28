import Image from "next/image";

type MercadoPagoIconProps = {
  className?: string;
  size?: number;
};

export function MercadoPagoIcon({
  className = "",
  size = 40,
}: MercadoPagoIconProps) {
  return (
    <Image
      src="/mercadopago-logo.png"
      alt="Mercado Pago"
      width={size}
      height={size}
      className={className}
    />
  );
}
