import Image from "next/image";

type GoogleAdsIconProps = {
  className?: string;
  size?: number;
};

export function GoogleAdsIcon({
  className = "",
  size = 40,
}: GoogleAdsIconProps) {
  return (
    <Image
      src="/google-ads-logo.png"
      alt="Google Ads"
      width={size}
      height={size}
      className={className}
    />
  );
}
