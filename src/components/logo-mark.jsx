import Image from "next/image";

export function LogoMark({
  className = "",
  altSuffix = "logo",
  logoPath,
  siteName,
}) {
  if (!logoPath) {
    return <span className={`${className} logo-text`}>{siteName}</span>;
  }

  return (
    // Replace the file at `logoPath` with your own logo to customize branding.
    <Image
      src={logoPath}
      alt={`${siteName} ${altSuffix}`}
      width={540}
      height={84}
      className={className}
    />
  );
}
