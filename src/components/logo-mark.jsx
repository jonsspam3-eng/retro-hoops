import Image from "next/image";
import { brandConfig } from "@/data/brand-config";

export function LogoMark({ className = "", altSuffix = "logo" }) {
  if (!brandConfig.logoPath) {
    return <span className={`${className} logo-text`}>{brandConfig.siteName}</span>;
  }

  return (
    // Replace the file at `brandConfig.logoPath` with your own logo to customize branding.
    <Image
      src={brandConfig.logoPath}
      alt={`${brandConfig.siteName} ${altSuffix}`}
      width={540}
      height={84}
      className={className}
    />
  );
}
