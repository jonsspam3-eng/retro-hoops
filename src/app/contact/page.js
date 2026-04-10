import Link from "next/link";
import { getContentStore } from "@/lib/content-store";

export async function generateMetadata() {
  const content = await getContentStore();
  return {
    title: `Contact — ${content.site.siteName}`,
  };
}

export default async function ContactPage() {
  const content = await getContentStore();
  const textAlignClass =
    content.site.textAlign === "right"
      ? "text-align-right"
      : content.site.textAlign === "center"
        ? "text-align-center"
        : "text-align-left";

  return (
    <section className={`content-page prose-page ${textAlignClass}`}>
      <header className="section-header">
        <h1>{content.pageHeaders.contact.title}</h1>
      </header>

      <p>{content.contact.intro}</p>
      <p>{content.contact.collaborationLine}</p>

      <ul className="contact-list">
        <li>
          email:{" "}
          <Link href={`mailto:${content.contact.email}`}>
            {content.contact.email}
          </Link>
        </li>
        {content.socialLinks.map((social) => (
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
