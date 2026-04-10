"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

export function PhotographyArchive({ entries, categories }) {
  const [activeCategory, setActiveCategory] = useState(categories[0] ?? "all");
  const [activeItem, setActiveItem] = useState(null);

  const filteredEntries = useMemo(() => {
    if (activeCategory === "all") {
      return entries;
    }
    return entries.filter((entry) => entry.category === activeCategory);
  }, [activeCategory, entries]);

  return (
    <>
      <section className="archive-layout">
        <aside className="archive-sidebar" aria-label="Photography categories">
          <ul>
            {categories.map((category) => (
              <li key={category}>
                <button
                  type="button"
                  onClick={() => setActiveCategory(category)}
                  className={activeCategory === category ? "is-active" : undefined}
                >
                  {category}
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="archive-grid-wrap">
          <ul className="archive-grid">
            {filteredEntries.map((entry) => (
              <li key={entry.id}>
                <button
                  type="button"
                  className="archive-card"
                  onClick={() => setActiveItem(entry)}
                >
                  {/* Replace image paths from /admin or src/data/content-store.json. */}
                  <Image
                    src={entry.image}
                    alt={`${entry.title} — ${entry.location}`}
                    width={960}
                    height={1200}
                  />
                  <span>
                    {entry.title} / {entry.year}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {activeItem ? (
        <div
          role="dialog"
          aria-modal="true"
          className="lightbox"
          onClick={() => setActiveItem(null)}
        >
          <div
            className="lightbox-inner"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="lightbox-close"
              onClick={() => setActiveItem(null)}
            >
              close
            </button>
            <Image
              src={activeItem.image}
              alt={activeItem.title}
              width={1400}
              height={1800}
              priority
            />
            <p>
              {activeItem.title} / {activeItem.location} / {activeItem.year}
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
