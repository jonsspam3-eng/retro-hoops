import Link from "next/link";
import { getContentStore } from "@/lib/content-store";

export default async function NotFound() {
  const content = await getContentStore();
  const alignClass = `align-${content.site.textAlign ?? "left"}`;

  return (
    <section className={`content-page prose-page ${alignClass}`}>
      <header className="section-header">
        <h1>{content.notFound.title}</h1>
      </header>
      <p>{content.notFound.message}</p>
      <Link href="/">{content.notFound.backLabel}</Link>
    </section>
  );
}
