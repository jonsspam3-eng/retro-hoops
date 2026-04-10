import Link from "next/link";

export default function NotFound() {
  return (
    <section className="content-page prose-page">
      <header className="section-header">
        <h1>not found</h1>
      </header>
      <p>The page you requested is not available in this archive.</p>
      <Link href="/">return to index</Link>
    </section>
  );
}
