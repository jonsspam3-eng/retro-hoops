import Link from "next/link";

export const metadata = {
  title: "Contact — archive_13",
};

export default function ContactPage() {
  return (
    <section className="content-page prose-page">
      <header className="section-header">
        <h1>contact</h1>
      </header>

      <p>Open to commissions, collaborations, and visual research projects.</p>

      <ul className="contact-list">
        {/* Replace email and links with your own contact details. */}
        <li>
          email: <Link href="mailto:hello@archive13.studio">hello@archive13.studio</Link>
        </li>
        <li>
          instagram:{" "}
          <Link href="https://instagram.com" target="_blank" rel="noreferrer">
            @archive_13
          </Link>
        </li>
        <li>
          are.na:{" "}
          <Link href="https://www.are.na" target="_blank" rel="noreferrer">
            are.na/archive13
          </Link>
        </li>
      </ul>
    </section>
  );
}
