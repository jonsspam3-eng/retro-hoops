import Link from "next/link";
import { siteContent } from "@/data/site-content";

export default function NotFound() {
  return (
    <section className="content-page prose-page">
      <header className="section-header">
        <h1>{siteContent.notFound.title}</h1>
      </header>
      <p>{siteContent.notFound.message}</p>
      <Link href="/">{siteContent.notFound.backLabel}</Link>
    </section>
  );
}
