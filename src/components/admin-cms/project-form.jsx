"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { ConfirmModal } from "@/components/admin-cms/confirm-modal";
import { MediaPickerModal } from "@/components/admin-cms/media-picker-modal";
import { moveItem, getDragPayload, setDragPayload } from "@/components/admin-cms/admin-utils";
import { useAdminToast } from "@/components/admin-cms/toast-context";

const blankProject = {
  title: "",
  slug: "",
  description: "",
  category: "",
  thumbnail: "",
  galleryImagesText: "",
  liveLink: "",
  sortOrder: 0,
  featured: false,
  published: true,
};

function createBlankProject() {
  return { ...blankProject };
}

function parseGalleryImages(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function toForm(project) {
  if (!project) {
    return blankProject;
  }
  return {
    title: project.title || "",
    slug: project.slug || "",
    description: project.description || "",
    category: project.category || "",
    thumbnail: project.thumbnail || "",
    galleryImagesText: (project.galleryImages || []).join("\n"),
    liveLink: project.liveLink || "",
    sortOrder: project.sortOrder ?? 0,
    featured: Boolean(project.featured),
    published: Boolean(project.published),
  };
}

export function ProjectForm({ initialValues, onSuccess, submitLabel = "save project" }) {
  const [form, setForm] = useState(() => toForm(initialValues));
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setForm(toForm(initialValues));
  }, [initialValues]);

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    try {
      const payload = {
        title: form.title,
        slug: form.slug,
        description: form.description,
        category: form.category,
        thumbnail: form.thumbnail,
        galleryImages: parseGalleryImages(form.galleryImagesText),
        liveLink: form.liveLink,
        sortOrder: Number(form.sortOrder) || 0,
        featured: Boolean(form.featured),
        published: Boolean(form.published),
      };

      const endpoint = initialValues?.id
        ? `/api/admin/projects/${initialValues.id}`
        : "/api/admin/projects";
      const method = initialValues?.id ? "PUT" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();

      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "Unable to save project.");
      }

      setStatus("saved");
      setMessage("Saved.");
      onSuccess?.(result.project);
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Unable to save project.");
    }
  }

  return (
    <form className="admin-form-grid" onSubmit={handleSubmit}>
      <label className="admin-field">
        <span>title</span>
        <input
          value={form.title}
          onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          required
        />
      </label>
      <label className="admin-field">
        <span>slug</span>
        <input
          value={form.slug}
          onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
          required
        />
      </label>
      <label className="admin-field admin-field-full">
        <span>description</span>
        <textarea
          rows={3}
          value={form.description}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, description: event.target.value }))
          }
          required
        />
      </label>
      <label className="admin-field">
        <span>category</span>
        <input
          value={form.category}
          onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
          required
        />
      </label>
      <label className="admin-field">
        <span>thumbnail URL</span>
        <input
          value={form.thumbnail}
          onChange={(event) => setForm((prev) => ({ ...prev, thumbnail: event.target.value }))}
          required
        />
      </label>
      <label className="admin-field admin-field-full">
        <span>gallery images (one URL per line)</span>
        <textarea
          rows={4}
          value={form.galleryImagesText}
          onChange={(event) =>
            setForm((prev) => ({ ...prev, galleryImagesText: event.target.value }))
          }
        />
      </label>
      <label className="admin-field">
        <span>live link</span>
        <input
          value={form.liveLink || ""}
          onChange={(event) => setForm((prev) => ({ ...prev, liveLink: event.target.value }))}
        />
      </label>
      <label className="admin-field">
        <span>sort order</span>
        <input
          type="number"
          value={form.sortOrder}
          onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
        />
      </label>
      <label className="admin-check">
        <input
          type="checkbox"
          checked={Boolean(form.featured)}
          onChange={(event) => setForm((prev) => ({ ...prev, featured: event.target.checked }))}
        />
        featured
      </label>
      <label className="admin-check">
        <input
          type="checkbox"
          checked={Boolean(form.published)}
          onChange={(event) => setForm((prev) => ({ ...prev, published: event.target.checked }))}
        />
        published
      </label>
      <button type="submit" className="admin-save">
        {status === "saving" ? "saving..." : submitLabel}
      </button>
      {message ? <p className={`admin-message is-${status}`}>{message}</p> : null}
    </form>
  );
}

export function ProjectsManager({ initialProjects = [] }) {
  const { pushToast } = useAdminToast();
  const [projects, setProjects] = useState(initialProjects);
  const [activeProjectId, setActiveProjectId] = useState(initialProjects[0]?.id ?? null);
  const [form, setForm] = useState(() => toForm(initialProjects[0]));
  const [mediaItems, setMediaItems] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [pickerMode, setPickerMode] = useState(null);
  const [draggingId, setDraggingId] = useState(null);
  const [savingOrder, setSavingOrder] = useState(false);

  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) || null,
    [activeProjectId, projects],
  );
  const galleryImages = useMemo(
    () => parseGalleryImages(form.galleryImagesText),
    [form.galleryImagesText],
  );
  const selectedPickerUrls = useMemo(() => {
    if (pickerMode === "thumbnail") {
      return form.thumbnail ? [form.thumbnail] : [];
    }
    if (pickerMode === "gallery") {
      return galleryImages;
    }
    return [];
  }, [form.thumbnail, galleryImages, pickerMode]);

  useEffect(() => {
    if (!activeProjectId) {
      setForm(blankProject);
      return;
    }
    setForm(toForm(activeProject));
  }, [activeProject, activeProjectId]);

  useEffect(() => {
    async function loadMedia() {
      const response = await fetch("/api/admin/media", { cache: "no-store" });
      const result = await response.json();
      if (response.ok) {
        setMediaItems(result.media || []);
      }
    }
    loadMedia();
  }, []);

  function updateField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function startNewProject() {
    setActiveProjectId(null);
    setForm(createBlankProject());
    setError("");
  }

  function openPicker(mode) {
    setPickerMode(mode);
  }

  function closePicker() {
    setPickerMode(null);
  }

  function handleMediaSelect(item) {
    if (pickerMode === "thumbnail") {
      updateField("thumbnail", item.url);
      closePicker();
      return;
    }

    const exists = galleryImages.includes(item.url);
    const nextGallery = exists
      ? galleryImages.filter((url) => url !== item.url)
      : [...galleryImages, item.url];
    updateField("galleryImagesText", nextGallery.join("\n"));
  }

  async function refreshProjects(nextActiveId) {
    const response = await fetch("/api/admin/projects", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok) {
      return;
    }
    const nextProjects = result.projects || [];
    setProjects(nextProjects);
    if (nextActiveId === null) {
      setActiveProjectId(null);
      setForm(createBlankProject());
      return;
    }
    if (nextActiveId) {
      const nextActive = nextProjects.find((project) => project.id === nextActiveId);
      if (nextActive) {
        setActiveProjectId(nextActive.id);
        setForm(toForm(nextActive));
      }
    }
  }

  async function persistOrder(nextProjects, previousProjects) {
    setSavingOrder(true);
    setError("");
    try {
      const response = await fetch("/api/admin/projects/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: nextProjects.map((project) => project.id) }),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result?.error || "Unable to save project order.");
      }
      setProjects(result.projects || []);
      pushToast({
        title: "Project order updated",
        message: "Drag-and-drop sequence saved.",
      });
    } catch (orderError) {
      setProjects(previousProjects);
      setError(orderError.message || "Unable to save project order.");
      pushToast({
        title: "Project order failed",
        message: orderError.message || "Try again.",
        tone: "error",
      });
    } finally {
      setSavingOrder(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload = {
        title: form.title,
        slug: form.slug,
        description: form.description,
        category: form.category,
        thumbnail: form.thumbnail,
        galleryImages,
        liveLink: form.liveLink,
        sortOrder: Number(form.sortOrder) || 0,
        featured: Boolean(form.featured),
        published: Boolean(form.published),
      };
      const endpoint = activeProjectId ? `/api/admin/projects/${activeProjectId}` : "/api/admin/projects";
      const method = activeProjectId ? "PUT" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.ok) {
        throw new Error(result?.error || "Unable to save project.");
      }

      const savedProject = result.project;
      await refreshProjects(savedProject?.id || activeProjectId);
      pushToast({
        title: activeProjectId ? "Project updated" : "Project created",
        message: savedProject?.title || "Saved.",
      });
    } catch (submitError) {
      setError(submitError.message || "Unable to save project.");
      pushToast({
        title: "Save failed",
        message: submitError.message || "Unable to save project.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) {
      return;
    }

    setError("");
    const response = await fetch(`/api/admin/projects/${deleteTarget.id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) {
      const message = result?.error || "Unable to delete project.";
      setError(message);
      pushToast({
        title: "Delete failed",
        message,
        tone: "error",
      });
      return;
    }

    const deletedId = deleteTarget.id;
    setDeleteTarget(null);
    const fallbackId = activeProjectId === deletedId ? null : activeProjectId;
    await refreshProjects(fallbackId);
    pushToast({
      title: "Project deleted",
      message: "The project has been removed.",
    });
  }

  return (
    <div className="admin-cms-split admin-cms-split-wide">
      <aside className="admin-cms-list">
        <div className="admin-cms-list-head">
          <h2>project list</h2>
          <button type="button" className="admin-cms-button" onClick={startNewProject}>
            new project
          </button>
        </div>
        <p className="admin-cms-meta">drag to reorder / {savingOrder ? "saving..." : "saved"}</p>
        <ul>
          {projects.map((project) => (
            <li
              key={project.id}
              draggable
              className={`draggable-row ${
                project.id === activeProjectId ? "is-active" : ""
              } ${draggingId === project.id ? "is-dragging" : ""}`}
              onDragStart={(event) => {
                setDragPayload(event, project.id);
                setDraggingId(project.id);
              }}
              onDragEnd={() => setDraggingId(null)}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                const draggedId = getDragPayload(event);
                if (!Number.isFinite(draggedId) || draggedId === project.id) {
                  return;
                }
                const fromIndex = projects.findIndex((item) => item.id === draggedId);
                const toIndex = projects.findIndex((item) => item.id === project.id);
                if (fromIndex < 0 || toIndex < 0) {
                  return;
                }
                const previous = projects;
                const next = moveItem(projects, fromIndex, toIndex);
                setProjects(next);
                setDraggingId(null);
                persistOrder(next, previous);
              }}
            >
              <button
                type="button"
                className="admin-cms-link"
                onClick={() => setActiveProjectId(project.id)}
              >
                {project.title}
              </button>
              <span>{project.published ? "published" : "draft"}</span>
              <button
                type="button"
                className="admin-delete"
                onClick={() => setDeleteTarget({ id: project.id, title: project.title })}
              >
                delete
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <section className="admin-crud-editor">
        <header className="admin-cms-editor-head">
          <h2>{activeProjectId ? "edit project" : "create project"}</h2>
          <p>Add details, control publishing, and pick assets from your media library.</p>
        </header>
        <form className="admin-form-grid" onSubmit={submit}>
          <label className="admin-field">
            <span>title</span>
            <input
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              required
            />
          </label>
          <label className="admin-field">
            <span>slug</span>
            <input
              value={form.slug}
              onChange={(event) => updateField("slug", event.target.value)}
              required
            />
          </label>
          <label className="admin-field admin-field-full">
            <span>description</span>
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              required
            />
          </label>
          <label className="admin-field">
            <span>category</span>
            <input
              value={form.category}
              onChange={(event) => updateField("category", event.target.value)}
              required
            />
          </label>
          <label className="admin-field">
            <span>live link</span>
            <input
              value={form.liveLink || ""}
              onChange={(event) => updateField("liveLink", event.target.value)}
              placeholder="https://..."
            />
          </label>
          <label className="admin-field">
            <span>sort order</span>
            <input
              type="number"
              value={form.sortOrder}
              onChange={(event) => updateField("sortOrder", event.target.value)}
            />
          </label>
          <div className="admin-field admin-field-full">
            <span>thumbnail</span>
            <div className="admin-inline-action-row">
              <input
                value={form.thumbnail}
                onChange={(event) => updateField("thumbnail", event.target.value)}
                required
              />
              <button
                type="button"
                className="admin-cms-button"
                onClick={() => openPicker("thumbnail")}
              >
                pick image
              </button>
            </div>
          </div>
          <div className="admin-field admin-field-full">
            <span>gallery images</span>
            <div className="admin-inline-action-row">
              <textarea
                rows={5}
                value={form.galleryImagesText}
                onChange={(event) => updateField("galleryImagesText", event.target.value)}
                placeholder="one URL per line"
              />
              <button
                type="button"
                className="admin-cms-button"
                onClick={() => openPicker("gallery")}
              >
                add from library
              </button>
            </div>
          </div>
          <div className="admin-check-row admin-field-full">
            <label className="admin-check">
              <input
                type="checkbox"
                checked={Boolean(form.featured)}
                onChange={(event) => updateField("featured", event.target.checked)}
              />
              featured
            </label>
            <label className="admin-check">
              <input
                type="checkbox"
                checked={Boolean(form.published)}
                onChange={(event) => updateField("published", event.target.checked)}
              />
              published
            </label>
          </div>

          {(form.thumbnail || galleryImages.length > 0) && (
            <div className="admin-inline-previews admin-field-full">
              {form.thumbnail ? (
                <figure>
                  <Image src={form.thumbnail} alt="Project thumbnail" width={420} height={320} />
                  <figcaption>thumbnail</figcaption>
                </figure>
              ) : null}
              {galleryImages.length > 0 ? (
                <div className="admin-gallery-preview-grid">
                  {galleryImages.slice(0, 6).map((url) => (
                    <figure key={url}>
                      <Image src={url} alt="Gallery preview" width={260} height={320} />
                    </figure>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          <button type="submit" className="admin-save" disabled={saving}>
            {saving ? "saving..." : activeProjectId ? "update project" : "create project"}
          </button>
          {error ? <p className="admin-message is-error">{error}</p> : null}
        </form>
      </section>

      <MediaPickerModal
        open={Boolean(pickerMode)}
        title={pickerMode === "gallery" ? "Select gallery images" : "Select thumbnail"}
        allowMultiple={pickerMode === "gallery"}
        items={mediaItems}
        selectedUrls={selectedPickerUrls}
        onSelect={handleMediaSelect}
        onClose={closePicker}
      />

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete project"
        message={`Delete "${deleteTarget?.title || "this project"}"? This cannot be undone.`}
        confirmLabel="delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
