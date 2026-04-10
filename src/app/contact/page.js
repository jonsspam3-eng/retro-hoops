import Link from "next/link";
import { brandConfig } from "@/data/brand-config";
import { siteContent } from "@/data/site-content";

export const metadata = {
  title: `Contact — ${brandConfig.siteName}`,
};

export default function ContactPage() {
  return (
    <section className="content-page prose-page">
      <header className="section-header">
        <h1>{siteContent.pageHeaders.contact.title}</h1>
      </header>

      <p>{siteContent.contact.intro}</p>
      <p>{siteContent.contact.collaborationLine}</p>

      <ul className="contact-list">
        <li>
          email:{" "}
          <Link href={`mailto:${siteContent.contact.email}`}>
            {siteContent.contact.email}
          </Link>
        </li>
        {siteContent.socialLinks.map((social) => (
          <li key={social.label}>
            {social.label}:{" "}
            <Link href={social.href} target="_blank" rel="noreferrer">
              {social.handle ?? social.href}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
