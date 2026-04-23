"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

function matchesQuery(item, query) {
  if (!query) {
    return true;
  }
  const haystack = [
    item.title,
    item.altText,
    item.category,
    item.location,
    item.moodType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query);
}

export function MediaPickerModal({
  open,
  items = [],
  title = "Select media",
  allowMultiple = false,
  selectedUrls = [],
  onSelect,
  onClose,
}) {
  const [search, setSearch] = useState("");
  const query = search.trim().toLowerCase();
  const filtered = useMemo(
    () => items.filter((item) => matchesQuery(item, query)),
    [items, query],
  );
  const selectedSet = useMemo(() => new Set(selectedUrls), [selectedUrls]);

  if (!open) {
    return null;
  }

  return (
    <div className="admin-modal-backdrop" role="presentation" onClick={onClose}>
      <div
        className="admin-modal admin-modal-wide"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="admin-modal-head">
          <h2>{title}</h2>
          <button type="button" className="admin-cms-button" onClick={onClose}>
            close
          </button>
        </header>

        <label className="admin-field">
          <span>search media</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="title, category, location..."
          />
        </label>

        <ul className="admin-media-picker-grid">
          {filtered.map((item) => {
            const isActive = selectedSet.has(item.url);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  className={`admin-media-picker-card ${isActive ? "is-active" : ""}`}
                  onClick={() => onSelect?.(item, { allowMultiple })}
                >
                  <Image
                    src={item.url}
                    alt={item.altText || item.title}
                    width={540}
                    height={720}
                  />
                  <span>{item.title}</span>
                  <small>{item.collection?.toLowerCase()}</small>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
