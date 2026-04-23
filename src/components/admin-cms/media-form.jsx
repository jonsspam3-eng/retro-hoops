"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ConfirmModal } from "@/components/admin-cms/confirm-modal";
import { moveItem, getDragPayload, setDragPayload } from "@/components/admin-cms/admin-utils";
import { useAdminToast } from "@/components/admin-cms/toast-context";

const COLLECTIONS = ["LIBRARY", "PHOTOGRAPHY", "MOODBOARD"];
const emptyForm = {
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
};

function createEmptyForm() {
  return { ...emptyForm };
}

function toForm(item) {
  if (!item) {
    return createEmptyForm();
  }
  return {
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
  };
}

function matchesMediaFilters(item, query, collectionFilter) {
  const collectionPass = collectionFilter === "ALL" || item.collection === collectionFilter;
  if (!collectionPass) {
    return false;
  }
  if (!query) {
    return true;
  }
  const searchable = [item.title, item.altText, item.category, item.location, item.moodType]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return searchable.includes(query);
}

export function MediaForm({ initialItems = [] }) {
  const { pushToast } = useAdminToast();
  const [items, setItems] = useState(initialItems);
  const [activeId, setActiveId] = useState(initialItems[0]?.id ?? null);
  const [form, setForm] = useState(() => toForm(initialItems[0]));
  const [search, setSearch] = useState("");
  const [collectionFilter, setCollectionFilter] = useState("ALL");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingOrder, setSavingOrder] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [error, setError] = useState("");
  const activeItem = useMemo(() => items.find((item) => item.id === activeId) || null, [activeId, items]);
  const isEditing = Boolean(activeItem?.id);
  const filteredItems = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => matchesMediaFilters(item, query, collectionFilter));
  }, [items, collectionFilter, search]);

  useEffect(() => {
    if (!activeId) {
      setForm(createEmptyForm());
      return;
    }
    setForm(toForm(activeItem));
  }, [activeId, activeItem]);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function persistOrder(nextItems, previousItems) {
    setSavingOrder(true);
    try {
      const response = await fetch("/api/admin/media/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: nextItems.map((item) => item.id) }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result?.error || "Unable to save media order.");
      }
      setItems(result.media || []);
      pushToast({
        title: "Media order updated",
        message: "Asset sequence saved.",
      });
    } catch (reorderError) {
      setItems(previousItems);
      setError(reorderError.message || "Unable to save media order.");
      pushToast({
        title: "Media order failed",
        message: reorderError.message || "Try again.",
        tone: "error",
      });
    } finally {
      setSavingOrder(false);
    }
  }

  async function uploadToCloudinary(files) {
    if (!files.length) {
      return;
    }
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      files.forEach((file) => body.append("files", file));
      body.append("collection", form.collection);
      body.append("category", form.category);
      body.append("altText", form.altText);
      if (files.length === 1) {
        body.append("title", form.title || files[0].name.replace(/\.[^.]+$/, ""));
      }

      const response = await fetch("/api/admin/media/upload", {
        method: "POST",
        body,
      });
      const result = await response.json();
      if (!response.ok || result?.ok === false) {
        throw new Error(result?.error || "Upload failed.");
      }

      const uploaded = Array.isArray(result.items)
        ? result.items
        : result.media
          ? [result.media]
          : [];
      if (!uploaded.length) {
        throw new Error("Upload completed but no media records were returned.");
      }

      setItems((prev) => [...uploaded, ...prev]);
      const first = uploaded[0];
      setActiveId(first.id);
      setForm(toForm(first));
      pushToast({
        title: uploaded.length > 1 ? "Assets uploaded" : "Asset uploaded",
        message:
          uploaded.length > 1
            ? `${uploaded.length} files added to media library.`
            : first.title || "Upload complete.",
      });
    } catch (uploadError) {
      setError(uploadError.message || "Upload failed.");
      pushToast({
        title: "Upload failed",
        message: uploadError.message || "Unable to upload files.",
        tone: "error",
      });
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
      if (!response.ok || result?.ok === false) {
        throw new Error(result?.error || "Unable to save media asset.");
      }

      const saved = result.media;
      if (isEditing) {
        setItems((prev) =>
          prev.map((item) => (item.id === saved.id ? saved : item)),
        );
        setForm(toForm(saved));
      } else {
        setItems((prev) => [saved, ...prev]);
        setActiveId(saved.id);
        setForm(toForm(saved));
      }
      pushToast({
        title: isEditing ? "Media updated" : "Media created",
        message: saved.title || "Saved.",
      });
    } catch (submitError) {
      setError(submitError.message || "Unable to save media asset.");
      pushToast({
        title: "Save failed",
        message: submitError.message || "Unable to save media.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function removeItem(id, title) {
    setDeleteTarget({ id, title });
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }
    const response = await fetch(`/api/admin/media/${deleteTarget.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok || result?.ok === false) {
      const message = result?.error || "Failed to delete media.";
      setError(message);
      pushToast({
        title: "Delete failed",
        message,
        tone: "error",
      });
      return;
    }
    setItems((prev) => prev.filter((item) => item.id !== deleteTarget.id));
    if (activeId === deleteTarget.id) {
      setActiveId(null);
      setForm(createEmptyForm());
    }
    pushToast({
      title: "Media deleted",
      message: "Asset removed.",
    });
    setDeleteTarget(null);
  }

  function loadItem(item) {
    setActiveId(item.id);
    setForm(toForm(item));
  }

  function startNew() {
    setActiveId(null);
    setForm(createEmptyForm());
    setError("");
  }

  async function copyUrl(url) {
    try {
      await navigator.clipboard.writeText(url);
      pushToast({
        title: "URL copied",
        message: "Media URL copied to clipboard.",
      });
    } catch {
      pushToast({
        title: "Copy failed",
        message: "Clipboard access unavailable.",
        tone: "error",
      });
    }
  }

  return (
    <section className="admin-cms-split admin-cms-split-wide">
      <aside className="admin-cms-list">
        <div className="admin-cms-list-head">
          <h2>media assets</h2>
          <button type="button" className="admin-cms-button" onClick={startNew}>
            new
          </button>
        </div>
        <label className="admin-field">
          <span>search</span>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="title, category, location..."
          />
        </label>
        <label className="admin-field">
          <span>filter collection</span>
          <select
            value={collectionFilter}
            onChange={(event) => setCollectionFilter(event.target.value)}
          >
            <option value="ALL">all</option>
            {COLLECTIONS.map((collection) => (
              <option key={collection} value={collection}>
                {collection.toLowerCase()}
              </option>
            ))}
          </select>
        </label>
        <p className="admin-cms-meta">
          drag to reorder / {savingOrder ? "saving..." : "saved"} / {filteredItems.length} shown
        </p>
        <ul>
          {filteredItems.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                draggable
                className={`admin-cms-link ${item.id === activeId ? "is-active" : ""} ${
                  draggingId === item.id ? "is-dragging" : ""
                }`}
                onClick={() => loadItem(item)}
                onDragStart={(event) => {
                  setDragPayload(event, item.id);
                  setDraggingId(item.id);
                }}
                onDragEnd={() => setDraggingId(null)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => {
                  event.preventDefault();
                  const draggedId = getDragPayload(event);
                  if (!Number.isFinite(draggedId) || draggedId === item.id) {
                    return;
                  }
                  const fromIndex = items.findIndex((entry) => entry.id === draggedId);
                  const toIndex = items.findIndex((entry) => entry.id === item.id);
                  if (fromIndex < 0 || toIndex < 0) {
                    return;
                  }
                  const previous = items;
                  const next = moveItem(items, fromIndex, toIndex);
                  setItems(next);
                  setDraggingId(null);
                  persistOrder(next, previous);
                }}
              >
                {item.title}
              </button>
              <button
                type="button"
                className="danger"
                onClick={() => removeItem(item.id, item.title)}
              >
                delete
              </button>
            </li>
          ))}
        </ul>
      </aside>
      <form className="cms-form" onSubmit={handleSubmit}>
      <header className="admin-cms-editor-head">
        <h2>{isEditing ? "edit media asset" : "create media asset"}</h2>
        <p>Upload, tag, preview, and organize assets for every page.</p>
      </header>
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
        <label className="upload-input upload-input-wide">
          <span>Upload image(s)</span>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(event) => {
              const files = Array.from(event.target.files || []);
              if (files.length) {
                uploadToCloudinary(files);
              }
            }}
          />
        </label>
        <div
          className={`admin-dropzone ${uploading ? "is-uploading" : ""}`}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const droppedFiles = Array.from(event.dataTransfer.files || []).filter((file) =>
              file.type.startsWith("image/"),
            );
            if (droppedFiles.length) {
              uploadToCloudinary(droppedFiles);
            }
          }}
        >
          <p>drag and drop image files here for bulk upload</p>
        </div>
        <span className="cms-upload-note">
          {uploading
            ? "Uploading..."
            : "Cloudinary upload with automatic media-library records."}
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
          <button type="button" className="admin-cms-button" onClick={() => copyUrl(form.url)}>
            copy url
          </button>
        </div>
      ) : null}

      {error ? <p className="cms-error">{error}</p> : null}

      <button type="submit" className="cms-submit" disabled={saving || uploading}>
        {saving ? "Saving..." : isEditing ? "Update Asset" : "Create Asset"}
      </button>
    </form>

    <ConfirmModal
      open={Boolean(deleteTarget)}
      title="Delete media asset"
      message={`Delete "${deleteTarget?.title || "this asset"}"? This cannot be undone.`}
      confirmLabel="delete"
      onConfirm={confirmDelete}
      onCancel={() => setDeleteTarget(null)}
    />
    </section>
  );
}
