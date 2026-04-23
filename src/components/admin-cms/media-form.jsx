"use client";

import Image from "next/image";
import { useState } from "react";

const COLLECTIONS = ["LIBRARY", "PHOTOGRAPHY", "MOODBOARD"];

export function MediaForm({ initialItems = [] }) {
  const [items, setItems] = useState(initialItems);
  const [activeId, setActiveId] = useState(initialItems[0]?.id ?? null);
  const activeItem = items.find((item) => item.id === activeId) || null;
  const isEditing = Boolean(activeItem?.id);
  const [form, setForm] = useState({
    title: activeItem?.title ?? "",
    url: activeItem?.url ?? "",
    altText: activeItem?.altText ?? "",
    publicId: activeItem?.publicId ?? "",
    collection: activeItem?.collection ?? "LIBRARY",
    category: activeItem?.category ?? "",
    year: activeItem?.year ?? "",
    location: activeItem?.location ?? "",
    moodType: activeItem?.moodType ?? "",
    sortOrder: String(activeItem?.sortOrder ?? 0),
    featured: Boolean(activeItem?.featured),
    published: activeItem?.published ?? true,
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function uploadToCloudinary(file) {
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("collection", form.collection);

      const response = await fetch("/api/admin/media/upload", {
        method: "POST",
        body,
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Upload failed.");
      }

      setForm((prev) => ({
        ...prev,
        url: result.url,
        publicId: result.publicId || "",
      }));
    } catch (uploadError) {
      setError(uploadError.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        ...form,
        sortOrder: Number(form.sortOrder) || 0,
      };

      const response = await fetch(
        isEditing ? `/api/admin/media/${activeItem.id}` : "/api/admin/media",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Unable to save media asset.");
      }

      if (isEditing) {
        setItems((prev) =>
          prev.map((item) => (item.id === result.media.id ? result.media : item)),
        );
      } else {
        setItems((prev) => [result.media, ...prev]);
        setActiveId(result.media.id);
      }
    } catch (submitError) {
      setError(submitError.message || "Unable to save media asset.");
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(id) {
    const response = await fetch(`/api/admin/media/${id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) {
      setError(result.error || "Failed to delete media.");
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== id));
    if (activeId === id) {
      setActiveId(null);
      setForm({
        title: "",
        url: "",
        altText: "",
        publicId: "",
        collection: "LIBRARY",
        category: "",
        year: "",
        location: "",
        moodType: "",
        sortOrder: "0",
        featured: false,
        published: true,
      });
    }
  }

  function loadItem(item) {
    setActiveId(item.id);
    setForm({
      title: item.title ?? "",
      url: item.url ?? "",
      altText: item.altText ?? "",
      publicId: item.publicId ?? "",
      collection: item.collection ?? "LIBRARY",
      category: item.category ?? "",
      year: item.year ?? "",
      location: item.location ?? "",
      moodType: item.moodType ?? "",
      sortOrder: String(item.sortOrder ?? 0),
      featured: Boolean(item.featured),
      published: item.published ?? true,
    });
  }

  function startNew() {
    setActiveId(null);
    setForm({
      title: "",
      url: "",
      altText: "",
      publicId: "",
      collection: "LIBRARY",
      category: "",
      year: "",
      location: "",
      moodType: "",
      sortOrder: "0",
      featured: false,
      published: true,
    });
  }

  return (
    <section className="admin-cms-split">
      <aside className="admin-cms-list">
        <div className="admin-cms-list-head">
          <h2>media assets</h2>
          <button type="button" className="admin-cms-button" onClick={startNew}>
            new
          </button>
        </div>
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={item.id === activeId ? "is-active" : undefined}
                onClick={() => loadItem(item)}
              >
                {item.title}
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => removeItem(item.id)}
              >
                delete
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <form className="cms-form" onSubmit={handleSubmit}>
      <div className="cms-form-grid">
        <label>
          <span>Title</span>
          <input
            value={form.title}
            onChange={(event) => updateField("title", event.target.value)}
            required
          />
        </label>

        <label>
          <span>Collection</span>
          <select
            value={form.collection}
            onChange={(event) => updateField("collection", event.target.value)}
          >
            {COLLECTIONS.map((collection) => (
              <option key={collection} value={collection}>
                {collection.toLowerCase()}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span>Image URL</span>
          <input
            value={form.url}
            onChange={(event) => updateField("url", event.target.value)}
            placeholder="https://..."
            required
          />
        </label>

        <label>
          <span>Public ID (Cloudinary)</span>
          <input
            value={form.publicId}
            onChange={(event) => updateField("publicId", event.target.value)}
            placeholder="optional"
          />
        </label>

        <label>
          <span>Alt text</span>
          <input
            value={form.altText}
            onChange={(event) => updateField("altText", event.target.value)}
            placeholder="Image description"
          />
        </label>

        <label>
          <span>Category</span>
          <input
            value={form.category}
            onChange={(event) => updateField("category", event.target.value)}
          />
        </label>

        <label>
          <span>Year</span>
          <input value={form.year} onChange={(event) => updateField("year", event.target.value)} />
        </label>

        <label>
          <span>Location</span>
          <input
            value={form.location}
            onChange={(event) => updateField("location", event.target.value)}
          />
        </label>

        <label>
          <span>Mood type</span>
          <input
            value={form.moodType}
            onChange={(event) => updateField("moodType", event.target.value)}
          />
        </label>

        <label>
          <span>Sort order</span>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(event) => updateField("sortOrder", event.target.value)}
          />
        </label>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(event) => updateField("featured", event.target.checked)}
          />
          <span>Featured</span>
        </label>

        <label className="checkbox-field">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(event) => updateField("published", event.target.checked)}
          />
          <span>Published</span>
        </label>
      </div>

      <div className="cms-upload-row">
        <label className="upload-input">
          <span>Upload image</span>
          <input
            type="file"
            accept="image/*"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                uploadToCloudinary(file);
              }
            }}
          />
        </label>
        <span className="cms-upload-note">
          {uploading ? "Uploading..." : "Cloudinary upload (or use URL manually)."}
        </span>
      </div>

      {form.url ? (
        <div className="cms-media-preview">
          <Image
            src={form.url}
            alt={form.altText || form.title}
            width={960}
            height={640}
          />
        </div>
      ) : null}

      {error ? <p className="cms-error">{error}</p> : null}

      <button type="submit" className="cms-submit" disabled={saving || uploading}>
        {saving ? "Saving..." : isEditing ? "Update Asset" : "Create Asset"}
      </button>
    </form>
    </section>
  );
}
