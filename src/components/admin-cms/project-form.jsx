"use client";

import { useState } from "react";

const defaultState = {
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

function parseGalleryImages(text) {
  return String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function ProjectForm({ initialValues, onSuccess, submitLabel = "save project" }) {
  const [form, setForm] = useState(
    initialValues
      ? {
          ...initialValues,
          galleryImagesText: (initialValues.galleryImages || []).join("\n"),
        }
      : defaultState,
  );
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

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
      onSuccess?.();
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
  const [projects, setProjects] = useState(initialProjects);
  const [activeProject, setActiveProject] = useState(null);
  const [deleteError, setDeleteError] = useState("");

  async function refreshProjects() {
    const response = await fetch("/api/admin/projects", { cache: "no-store" });
    const result = await response.json();
    if (response.ok) {
      setProjects(result.projects || []);
    }
  }

  async function deleteProjectById(id) {
    setDeleteError("");
    const response = await fetch(`/api/admin/projects/${id}`, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) {
      setDeleteError(result?.error || "Unable to delete project.");
      return;
    }
    await refreshProjects();
    if (activeProject?.id === id) {
      setActiveProject(null);
    }
  }

  return (
    <div className="admin-crud-layout">
      <section className="admin-crud-list">
        <header>
          <h2>project list</h2>
          <button
            type="button"
            className="admin-save"
            onClick={() => setActiveProject(null)}
          >
            new project
          </button>
        </header>
        <ul>
          {projects.map((project) => (
            <li key={project.id} className={activeProject?.id === project.id ? "active" : ""}>
              <button
                type="button"
                className="admin-cms-link"
                onClick={() => setActiveProject(project)}
              >
                {project.title}
              </button>
              <span>{project.published ? "published" : "draft"}</span>
              <button
                type="button"
                className="admin-delete"
                onClick={() => deleteProjectById(project.id)}
              >
                delete
              </button>
            </li>
          ))}
        </ul>
        {deleteError ? <p className="admin-message is-error">{deleteError}</p> : null}
      </section>

      <section className="admin-crud-editor">
        <h2>{activeProject ? "edit project" : "create project"}</h2>
        <ProjectForm
          initialValues={activeProject}
          submitLabel={activeProject ? "update project" : "create project"}
          onSuccess={refreshProjects}
        />
      </section>
    </div>
  );
}
