"use client";

import { useMemo, useState } from "react";

const emptyLink = { label: "", href: "" };
const emptySocial = { label: "", href: "", handle: "" };
const emptyPhoto = {
  id: "",
  title: "",
  category: "",
  year: "",
  location: "",
  image: "",
};
const emptyProject = {
  slug: "",
  title: "",
  year: "",
  discipline: "",
  summary: "",
  detail: "",
  image: "",
};
const emptyMood = { id: "", title: "", type: "", image: "" };

function clone(data) {
  return JSON.parse(JSON.stringify(data));
}

function ensureArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

function getByPath(target, path) {
  return String(path)
    .split(".")
    .reduce((current, segment) => (current ? current[segment] : undefined), target);
}

function updateRow(setter, path, index, field, value) {
  setter((prev) => {
    const next = clone(prev);
    const list = getByPath(next, path);
    list[index][field] = value;
    return next;
  });
}

function updateValueRow(setter, path, index, value) {
  setter((prev) => {
    const next = clone(prev);
    getByPath(next, path)[index] = value;
    return next;
  });
}

function removeRow(setter, path, index) {
  setter((prev) => {
    const next = clone(prev);
    getByPath(next, path).splice(index, 1);
    return next;
  });
}

function addRow(setter, path, template) {
  setter((prev) => {
    const next = clone(prev);
    getByPath(next, path).push(clone(template));
    return next;
  });
}

function addValueRow(setter, path, value = "") {
  setter((prev) => {
    const next = clone(prev);
    getByPath(next, path).push(value);
    return next;
  });
}

function moveRow(setter, path, fromIndex, toIndex) {
  if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) {
    return;
  }

  setter((prev) => {
    const next = clone(prev);
    const list = getByPath(next, path);
    const [moved] = list.splice(fromIndex, 1);
    list.splice(toIndex, 0, moved);
    return next;
  });
}

function draggableClass(dragState, path, index) {
  return dragState?.path === path && dragState?.index === index ? "is-dragging" : "";
}

function TextInput({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input value={value ?? ""} onChange={onChange} placeholder={placeholder} />
    </label>
  );
}

function SelectInput({ label, value, onChange, options }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <select value={value ?? ""} onChange={onChange}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function TextArea({ label, value, onChange, rows = 3, placeholder = "" }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <textarea
        value={value ?? ""}
        onChange={onChange}
        rows={rows}
        placeholder={placeholder}
      />
    </label>
  );
}

function PanelHeader({ title, onReset }) {
  return (
    <div className="admin-panel-head">
      <h2>{title}</h2>
      <button type="button" className="admin-reset" onClick={onReset}>
        reset section
      </button>
    </div>
  );
}

export function AdminEditor({ initialContent, passwordProtected = false }) {
  const [content, setContent] = useState(() => clone(initialContent));
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [dragState, setDragState] = useState(null);

  const preview = useMemo(
    () => ({
      siteName: content.site?.siteName ?? "",
      siteTitle: content.site?.siteTitle ?? "",
      logoPath: content.site?.logoPath ?? "",
      homeLinks: ensureArray(content.homepageLinks).slice(0, 8),
      navLinks: ensureArray(content.navigationLinks).slice(0, 8),
      archiveLinks: ensureArray(content.archiveBottomLinks).slice(0, 8),
      aboutParagraphs: ensureArray(content.about?.paragraphs).slice(0, 2),
      contactEmail: content.contact?.email ?? "",
      socialLinks: ensureArray(content.socialLinks).slice(0, 4),
      photos: ensureArray(content.photographyItems).slice(0, 8),
      projects: ensureArray(content.projects).slice(0, 4),
      moods: ensureArray(content.moodboardItems).slice(0, 6),
      notFound: content.notFound,
      projectDetail: content.projectDetail,
      textAlign: content.site?.textAlign ?? "left",
      homeTextAlign: content.site?.homeTextAlign ?? "center",
    }),
    [content],
  );

  function resetSection(...paths) {
    setContent((prev) => {
      const next = clone(prev);
      paths.forEach((path) => {
        next[path] = clone(initialContent[path]);
      });
      return next;
    });
  }

  function startDrag(path, index) {
    setDragState({ path, index });
  }

  function handleDrop(path, index) {
    if (!dragState || dragState.path !== path) {
      setDragState(null);
      return;
    }

    moveRow(setContent, path, dragState.index, index);
    setDragState(null);
  }

  async function saveContent() {
    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(content),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result?.error || "Save failed.");
      }

      setStatus("saved");
      setMessage("Saved. Refresh site pages to see updates.");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Unable to save changes.");
    }
  }

  async function handleLogout() {
    await fetch("/api/admin/auth", { method: "DELETE" });
    window.location.reload();
  }

  return (
    <section className="admin-editor">
      <header className="admin-header">
        <div>
          <h1>admin editor</h1>
          <p>Edit fields, drag photos to reorder, then save.</p>
        </div>
        <div className="admin-actions">
          {passwordProtected ? (
            <button type="button" className="admin-reset" onClick={handleLogout}>
              log out
            </button>
          ) : null}
          <button type="button" className="admin-save" onClick={saveContent}>
            {status === "saving" ? "saving..." : "save changes"}
          </button>
        </div>
      </header>

      {message ? <p className={`admin-message is-${status}`}>{message}</p> : null}

      <div className="admin-layout">
        <div className="admin-grid">
          <section className="admin-panel">
            <PanelHeader title="site / branding" onReset={() => resetSection("site")} />
            <TextInput
              label="site name"
              value={content.site.siteName}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  site: { ...prev.site, siteName: event.target.value },
                }))
              }
            />
            <TextInput
              label="site title"
              value={content.site.siteTitle}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  site: { ...prev.site, siteTitle: event.target.value },
                }))
              }
            />
            <TextArea
              label="site description"
              rows={3}
              value={content.site.siteDescription}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  site: { ...prev.site, siteDescription: event.target.value },
                }))
              }
            />
            <TextInput
              label="logo path"
              value={content.site.logoPath}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  site: { ...prev.site, logoPath: event.target.value },
                }))
              }
              placeholder="/images/logo/site-logo.svg"
            />
            <SelectInput
              label="global text align"
              value={content.site.textAlign}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  site: { ...prev.site, textAlign: event.target.value },
                }))
              }
              options={[
                { value: "left", label: "left" },
                { value: "center", label: "center" },
                { value: "right", label: "right" },
              ]}
            />
            <SelectInput
              label="home text align"
              value={content.site.homeTextAlign}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  site: { ...prev.site, homeTextAlign: event.target.value },
                }))
              }
              options={[
                { value: "left", label: "left" },
                { value: "center", label: "center" },
                { value: "right", label: "right" },
              ]}
            />
            <TextInput
              label="primary color"
              value={content.site.primaryColor}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  site: { ...prev.site, primaryColor: event.target.value },
                }))
              }
              placeholder="#a13a3a"
            />
            <TextInput
              label="background color"
              value={content.site.backgroundColor}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  site: { ...prev.site, backgroundColor: event.target.value },
                }))
              }
              placeholder="#0a0a0a"
            />
            <TextInput
              label="text color"
              value={content.site.textColor}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  site: { ...prev.site, textColor: event.target.value },
                }))
              }
              placeholder="#f2f2f2"
            />
            <TextInput
              label="default theme (dark/light)"
              value={content.site.defaultTheme}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  site: { ...prev.site, defaultTheme: event.target.value },
                }))
              }
            />
            <TextInput
              label="location label"
              value={content.site.locationLabel}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  site: { ...prev.site, locationLabel: event.target.value },
                }))
              }
            />
            <TextInput
              label="footer note"
              value={content.site.footerNote}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  site: { ...prev.site, footerNote: event.target.value },
                }))
              }
            />
          </section>

          <section className="admin-panel">
            <PanelHeader
              title="about / contact"
              onReset={() => resetSection("about", "contact")}
            />
            <h3>about paragraphs</h3>
            <p className="admin-hint">Drag to reorder paragraph flow.</p>
            <div className="admin-list">
              {ensureArray(content.about.paragraphs).map((paragraph, index) => (
                <div
                  className={`admin-row draggable-row ${draggableClass(
                    dragState,
                    "about.paragraphs",
                    index,
                  )}`}
                  key={`about-paragraph-${index}`}
                  draggable
                  onDragStart={() => startDrag("about.paragraphs", index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop("about.paragraphs", index)}
                  onDragEnd={() => setDragState(null)}
                >
                  <p className="drag-label">drag</p>
                  <TextArea
                    label={`paragraph ${index + 1}`}
                    rows={4}
                    value={paragraph}
                    onChange={(event) =>
                      setContent((prev) => {
                        const next = clone(prev);
                        next.about.paragraphs[index] = event.target.value;
                        return next;
                      })
                    }
                  />
                  <button
                    type="button"
                    className="admin-delete"
                    onClick={() =>
                      setContent((prev) => {
                        const next = clone(prev);
                        next.about.paragraphs.splice(index, 1);
                        return next;
                      })
                    }
                  >
                    remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="admin-add"
              onClick={() =>
                setContent((prev) => {
                  const next = clone(prev);
                  next.about.paragraphs.push("");
                  return next;
                })
              }
            >
              add paragraph
            </button>

            <h3>about sections</h3>
            <p className="admin-hint">Drag section cards to reorder.</p>
            <div className="admin-list">
              {ensureArray(content.about.sections).map((section, index) => (
                <div
                  className={`admin-row media-row draggable-row ${draggableClass(
                    dragState,
                    "about.sections",
                    index,
                  )}`}
                  key={`about-section-${index}-${section.title}`}
                  draggable
                  onDragStart={() => startDrag("about.sections", index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop("about.sections", index)}
                  onDragEnd={() => setDragState(null)}
                >
                  <p className="drag-label">drag</p>
                  <TextInput
                    label="section title"
                    value={section.title}
                    onChange={(event) =>
                      setContent((prev) => {
                        const next = clone(prev);
                        next.about.sections[index].title = event.target.value;
                        return next;
                      })
                    }
                  />
                  <TextArea
                    label="section text"
                    rows={3}
                    value={section.text}
                    onChange={(event) =>
                      setContent((prev) => {
                        const next = clone(prev);
                        next.about.sections[index].text = event.target.value;
                        return next;
                      })
                    }
                  />
                  <button
                    type="button"
                    className="admin-delete"
                    onClick={() =>
                      setContent((prev) => {
                        const next = clone(prev);
                        next.about.sections.splice(index, 1);
                        return next;
                      })
                    }
                  >
                    remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="admin-add"
              onClick={() =>
                setContent((prev) => {
                  const next = clone(prev);
                  next.about.sections.push({ title: "", text: "" });
                  return next;
                })
              }
            >
              add about section
            </button>

            <TextArea
              label="contact intro"
              value={content.contact.intro}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  contact: { ...prev.contact, intro: event.target.value },
                }))
              }
            />
            <TextArea
              label="contact collaboration line"
              value={content.contact.collaborationLine}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  contact: { ...prev.contact, collaborationLine: event.target.value },
                }))
              }
            />
            <TextInput
              label="contact email"
              value={content.contact.email}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  contact: { ...prev.contact, email: event.target.value },
                }))
              }
            />
          </section>

          <section className="admin-panel">
            <PanelHeader
              title="page labels / utility copy"
              onReset={() => resetSection("pageHeaders", "projectDetail", "notFound")}
            />
            <TextInput
              label="photography page title"
              value={content.pageHeaders.photography.title}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  pageHeaders: {
                    ...prev.pageHeaders,
                    photography: {
                      ...prev.pageHeaders.photography,
                      title: event.target.value,
                    },
                  },
                }))
              }
            />
            <TextInput
              label="photography page description"
              value={content.pageHeaders.photography.description}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  pageHeaders: {
                    ...prev.pageHeaders,
                    photography: {
                      ...prev.pageHeaders.photography,
                      description: event.target.value,
                    },
                  },
                }))
              }
            />
            <TextInput
              label="projects page title"
              value={content.pageHeaders.projects.title}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  pageHeaders: {
                    ...prev.pageHeaders,
                    projects: {
                      ...prev.pageHeaders.projects,
                      title: event.target.value,
                    },
                  },
                }))
              }
            />
            <TextInput
              label="projects page description"
              value={content.pageHeaders.projects.description}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  pageHeaders: {
                    ...prev.pageHeaders,
                    projects: {
                      ...prev.pageHeaders.projects,
                      description: event.target.value,
                    },
                  },
                }))
              }
            />
            <TextInput
              label="moodboard page title"
              value={content.pageHeaders.moodboard.title}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  pageHeaders: {
                    ...prev.pageHeaders,
                    moodboard: {
                      ...prev.pageHeaders.moodboard,
                      title: event.target.value,
                    },
                  },
                }))
              }
            />
            <TextInput
              label="moodboard page description"
              value={content.pageHeaders.moodboard.description}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  pageHeaders: {
                    ...prev.pageHeaders,
                    moodboard: {
                      ...prev.pageHeaders.moodboard,
                      description: event.target.value,
                    },
                  },
                }))
              }
            />
            <TextInput
              label="about page title"
              value={content.pageHeaders.about.title}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  pageHeaders: {
                    ...prev.pageHeaders,
                    about: { ...prev.pageHeaders.about, title: event.target.value },
                  },
                }))
              }
            />
            <TextInput
              label="contact page title"
              value={content.pageHeaders.contact.title}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  pageHeaders: {
                    ...prev.pageHeaders,
                    contact: { ...prev.pageHeaders.contact, title: event.target.value },
                  },
                }))
              }
            />
            <TextInput
              label="project detail back label"
              value={content.projectDetail.backLabel}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  projectDetail: { ...prev.projectDetail, backLabel: event.target.value },
                }))
              }
            />
            <TextInput
              label="not found title"
              value={content.notFound.title}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  notFound: { ...prev.notFound, title: event.target.value },
                }))
              }
            />
            <TextArea
              label="not found message"
              rows={3}
              value={content.notFound.message}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  notFound: { ...prev.notFound, message: event.target.value },
                }))
              }
            />
            <TextInput
              label="not found back label"
              value={content.notFound.backLabel}
              onChange={(event) =>
                setContent((prev) => ({
                  ...prev,
                  notFound: { ...prev.notFound, backLabel: event.target.value },
                }))
              }
            />
          </section>

          <section className="admin-panel admin-panel-wide">
            <PanelHeader
              title="navigation links"
              onReset={() =>
                resetSection("homepageLinks", "navigationLinks", "archiveBottomLinks")
              }
            />
            <h3>homepage links</h3>
            <p className="admin-hint">Drag to reorder homepage directory links.</p>
            <div className="admin-list">
              {ensureArray(content.homepageLinks).map((item, index) => (
                <div
                  className={`admin-row draggable-row ${draggableClass(
                    dragState,
                    "homepageLinks",
                    index,
                  )}`}
                  key={`home-${index}-${item.href}`}
                  draggable
                  onDragStart={() => startDrag("homepageLinks", index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop("homepageLinks", index)}
                  onDragEnd={() => setDragState(null)}
                >
                  <p className="drag-label">drag</p>
                  <TextInput
                    label="label"
                    value={item.label}
                    onChange={(event) =>
                      updateRow(setContent, "homepageLinks", index, "label", event.target.value)
                    }
                  />
                  <TextInput
                    label="href"
                    value={item.href}
                    onChange={(event) =>
                      updateRow(setContent, "homepageLinks", index, "href", event.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="admin-delete"
                    onClick={() => removeRow(setContent, "homepageLinks", index)}
                  >
                    remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="admin-add"
              onClick={() => addRow(setContent, "homepageLinks", emptyLink)}
            >
              add homepage link
            </button>

            <h3>top navigation links</h3>
            <p className="admin-hint">Drag to reorder header navigation links.</p>
            <div className="admin-list">
              {ensureArray(content.navigationLinks).map((item, index) => (
                <div
                  className={`admin-row draggable-row ${draggableClass(
                    dragState,
                    "navigationLinks",
                    index,
                  )}`}
                  key={`nav-${index}-${item.href}`}
                  draggable
                  onDragStart={() => startDrag("navigationLinks", index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop("navigationLinks", index)}
                  onDragEnd={() => setDragState(null)}
                >
                  <p className="drag-label">drag</p>
                  <TextInput
                    label="label"
                    value={item.label}
                    onChange={(event) =>
                      updateRow(setContent, "navigationLinks", index, "label", event.target.value)
                    }
                  />
                  <TextInput
                    label="href"
                    value={item.href}
                    onChange={(event) =>
                      updateRow(setContent, "navigationLinks", index, "href", event.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="admin-delete"
                    onClick={() => removeRow(setContent, "navigationLinks", index)}
                  >
                    remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="admin-add"
              onClick={() => addRow(setContent, "navigationLinks", emptyLink)}
            >
              add nav link
            </button>

            <h3>archive bottom links</h3>
            <p className="admin-hint">Drag to reorder utility links on archive pages.</p>
            <div className="admin-list">
              {ensureArray(content.archiveBottomLinks).map((item, index) => (
                <div
                  className={`admin-row draggable-row ${draggableClass(
                    dragState,
                    "archiveBottomLinks",
                    index,
                  )}`}
                  key={`archive-bottom-${index}-${item.href}`}
                  draggable
                  onDragStart={() => startDrag("archiveBottomLinks", index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop("archiveBottomLinks", index)}
                  onDragEnd={() => setDragState(null)}
                >
                  <p className="drag-label">drag</p>
                  <TextInput
                    label="label"
                    value={item.label}
                    onChange={(event) =>
                      updateRow(
                        setContent,
                        "archiveBottomLinks",
                        index,
                        "label",
                        event.target.value,
                      )
                    }
                  />
                  <TextInput
                    label="href"
                    value={item.href}
                    onChange={(event) =>
                      updateRow(
                        setContent,
                        "archiveBottomLinks",
                        index,
                        "href",
                        event.target.value,
                      )
                    }
                  />
                  <button
                    type="button"
                    className="admin-delete"
                    onClick={() => removeRow(setContent, "archiveBottomLinks", index)}
                  >
                    remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="admin-add"
              onClick={() => addRow(setContent, "archiveBottomLinks", emptyLink)}
            >
              add archive link
            </button>
          </section>

          <section className="admin-panel admin-panel-wide">
            <PanelHeader title="social links" onReset={() => resetSection("socialLinks")} />
            <p className="admin-hint">Drag to reorder social links.</p>
            <div className="admin-list">
              {ensureArray(content.socialLinks).map((item, index) => (
                <div
                  className={`admin-row social-row draggable-row ${draggableClass(
                    dragState,
                    "socialLinks",
                    index,
                  )}`}
                  key={`social-${index}-${item.label}`}
                  draggable
                  onDragStart={() => startDrag("socialLinks", index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop("socialLinks", index)}
                  onDragEnd={() => setDragState(null)}
                >
                  <p className="drag-label">drag</p>
                  <TextInput
                    label="label"
                    value={item.label}
                    onChange={(event) =>
                      updateRow(setContent, "socialLinks", index, "label", event.target.value)
                    }
                  />
                  <TextInput
                    label="handle"
                    value={item.handle}
                    onChange={(event) =>
                      updateRow(setContent, "socialLinks", index, "handle", event.target.value)
                    }
                  />
                  <TextInput
                    label="href"
                    value={item.href}
                    onChange={(event) =>
                      updateRow(setContent, "socialLinks", index, "href", event.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="admin-delete"
                    onClick={() => removeRow(setContent, "socialLinks", index)}
                  >
                    remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="admin-add"
              onClick={() => addRow(setContent, "socialLinks", emptySocial)}
            >
              add social link
            </button>
          </section>

          <section className="admin-panel admin-panel-wide">
            <PanelHeader
              title="photography items"
              onReset={() => resetSection("photographyCategories", "photographyItems")}
            />
            <h3>photography categories</h3>
            <p className="admin-hint">
              Drag category rows to reorder. Keep &quot;all&quot; as the first item.
            </p>
            <div className="admin-list">
              {ensureArray(content.photographyCategories).map((category, index) => (
                <div
                  className={`admin-row draggable-row ${draggableClass(
                    dragState,
                    "photographyCategories",
                    index,
                  )}`}
                  key={`photo-category-${index}-${category}`}
                  draggable
                  onDragStart={() => startDrag("photographyCategories", index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop("photographyCategories", index)}
                  onDragEnd={() => setDragState(null)}
                >
                  <p className="drag-label">drag</p>
                  <TextInput
                    label="category"
                    value={category}
                    onChange={(event) =>
                      updateValueRow(
                        setContent,
                        "photographyCategories",
                        index,
                        event.target.value,
                      )
                    }
                  />
                  <button
                    type="button"
                    className="admin-delete"
                    onClick={() => removeRow(setContent, "photographyCategories", index)}
                  >
                    remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="admin-add"
              onClick={() => addValueRow(setContent, "photographyCategories", "")}
            >
              add category
            </button>
            <p className="admin-hint">
              Drag and drop rows below to reorder photos in the portfolio grid.
            </p>
            <div className="admin-list">
              {ensureArray(content.photographyItems).map((item, index) => (
                <div
                  className={`admin-row media-row draggable-row ${
                    draggableClass(dragState, "photographyItems", index)
                  }`}
                  key={`photo-${index}-${item.id}`}
                  draggable
                  onDragStart={() => startDrag("photographyItems", index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop("photographyItems", index)}
                  onDragEnd={() => setDragState(null)}
                >
                  <p className="drag-label">drag</p>
                  <TextInput
                    label="id"
                    value={item.id}
                    onChange={(event) =>
                      updateRow(setContent, "photographyItems", index, "id", event.target.value)
                    }
                  />
                  <TextInput
                    label="title"
                    value={item.title}
                    onChange={(event) =>
                      updateRow(setContent, "photographyItems", index, "title", event.target.value)
                    }
                  />
                  <TextInput
                    label="category"
                    value={item.category}
                    onChange={(event) =>
                      updateRow(
                        setContent,
                        "photographyItems",
                        index,
                        "category",
                        event.target.value,
                      )
                    }
                  />
                  <TextInput
                    label="year"
                    value={item.year}
                    onChange={(event) =>
                      updateRow(setContent, "photographyItems", index, "year", event.target.value)
                    }
                  />
                  <TextInput
                    label="location"
                    value={item.location}
                    onChange={(event) =>
                      updateRow(
                        setContent,
                        "photographyItems",
                        index,
                        "location",
                        event.target.value,
                      )
                    }
                  />
                  <TextInput
                    label="image path"
                    value={item.image}
                    onChange={(event) =>
                      updateRow(setContent, "photographyItems", index, "image", event.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="admin-delete"
                    onClick={() => removeRow(setContent, "photographyItems", index)}
                  >
                    remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="admin-add"
              onClick={() => addRow(setContent, "photographyItems", emptyPhoto)}
            >
              add photography item
            </button>
          </section>

          <section className="admin-panel admin-panel-wide">
            <PanelHeader title="projects" onReset={() => resetSection("projects")} />
            <p className="admin-hint">Drag project rows to reorder project grid + detail routes.</p>
            <div className="admin-list">
              {ensureArray(content.projects).map((item, index) => (
                <div
                  className={`admin-row media-row draggable-row ${draggableClass(
                    dragState,
                    "projects",
                    index,
                  )}`}
                  key={`project-${index}-${item.slug}`}
                  draggable
                  onDragStart={() => startDrag("projects", index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop("projects", index)}
                  onDragEnd={() => setDragState(null)}
                >
                  <p className="drag-label">drag</p>
                  <TextInput
                    label="slug"
                    value={item.slug}
                    onChange={(event) =>
                      updateRow(setContent, "projects", index, "slug", event.target.value)
                    }
                  />
                  <TextInput
                    label="title"
                    value={item.title}
                    onChange={(event) =>
                      updateRow(setContent, "projects", index, "title", event.target.value)
                    }
                  />
                  <TextInput
                    label="year"
                    value={item.year}
                    onChange={(event) =>
                      updateRow(setContent, "projects", index, "year", event.target.value)
                    }
                  />
                  <TextInput
                    label="discipline"
                    value={item.discipline}
                    onChange={(event) =>
                      updateRow(setContent, "projects", index, "discipline", event.target.value)
                    }
                  />
                  <TextInput
                    label="image path"
                    value={item.image}
                    onChange={(event) =>
                      updateRow(setContent, "projects", index, "image", event.target.value)
                    }
                  />
                  <TextArea
                    label="summary"
                    rows={2}
                    value={item.summary}
                    onChange={(event) =>
                      updateRow(setContent, "projects", index, "summary", event.target.value)
                    }
                  />
                  <TextArea
                    label="detail"
                    rows={3}
                    value={item.detail}
                    onChange={(event) =>
                      updateRow(setContent, "projects", index, "detail", event.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="admin-delete"
                    onClick={() => removeRow(setContent, "projects", index)}
                  >
                    remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="admin-add"
              onClick={() => addRow(setContent, "projects", emptyProject)}
            >
              add project
            </button>
          </section>

          <section className="admin-panel admin-panel-wide">
            <PanelHeader title="moodboard items" onReset={() => resetSection("moodboardItems")} />
            <p className="admin-hint">Drag moodboard items to set archive order.</p>
            <div className="admin-list">
              {ensureArray(content.moodboardItems).map((item, index) => (
                <div
                  className={`admin-row media-row draggable-row ${draggableClass(
                    dragState,
                    "moodboardItems",
                    index,
                  )}`}
                  key={`mood-${index}-${item.id}`}
                  draggable
                  onDragStart={() => startDrag("moodboardItems", index)}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={() => handleDrop("moodboardItems", index)}
                  onDragEnd={() => setDragState(null)}
                >
                  <p className="drag-label">drag</p>
                  <TextInput
                    label="id"
                    value={item.id}
                    onChange={(event) =>
                      updateRow(setContent, "moodboardItems", index, "id", event.target.value)
                    }
                  />
                  <TextInput
                    label="title"
                    value={item.title}
                    onChange={(event) =>
                      updateRow(setContent, "moodboardItems", index, "title", event.target.value)
                    }
                  />
                  <TextInput
                    label="type"
                    value={item.type}
                    onChange={(event) =>
                      updateRow(setContent, "moodboardItems", index, "type", event.target.value)
                    }
                  />
                  <TextInput
                    label="image path"
                    value={item.image}
                    onChange={(event) =>
                      updateRow(setContent, "moodboardItems", index, "image", event.target.value)
                    }
                  />
                  <button
                    type="button"
                    className="admin-delete"
                    onClick={() => removeRow(setContent, "moodboardItems", index)}
                  >
                    remove
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              className="admin-add"
              onClick={() => addRow(setContent, "moodboardItems", emptyMood)}
            >
              add moodboard item
            </button>
          </section>
        </div>

        <aside className="admin-live-preview">
          <h2>live preview</h2>

          <article className="preview-card">
            <h3>site</h3>
            <p>
              <strong>{preview.siteName}</strong> — {preview.siteTitle}
            </p>
            <p>logo: {preview.logoPath}</p>
            <p>global align: {preview.textAlign}</p>
            <p>home align: {preview.homeTextAlign}</p>
          </article>

          <article className={`preview-card align-${preview.homeTextAlign}`}>
            <h3>home links</h3>
            <ul>
              {preview.homeLinks.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  {link.label} → {link.href}
                </li>
              ))}
            </ul>
          </article>

          <article className={`preview-card align-${preview.textAlign}`}>
            <h3>about / contact</h3>
            {preview.aboutParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
            <p>email: {preview.contactEmail}</p>
          </article>

          <article className="preview-card">
            <h3>navigation / socials</h3>
            <p>top navigation:</p>
            <ul>
              {preview.navLinks.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  {link.label}
                </li>
              ))}
            </ul>
            <p>socials:</p>
            <ul>
              {preview.socialLinks.map((item) => (
                <li key={`${item.label}-${item.href}`}>
                  {item.label}: {item.handle || item.href}
                </li>
              ))}
            </ul>
            <p>archive links:</p>
            <ul>
              {preview.archiveLinks.map((link) => (
                <li key={`${link.label}-${link.href}`}>
                  {link.label}
                </li>
              ))}
            </ul>
          </article>

          <article className="preview-card">
            <h3>photos (order preview)</h3>
            <div className="preview-image-grid">
              {preview.photos.map((item) => (
                <figure key={item.id}>
                  <div className="preview-image-thumb" aria-hidden="true" />
                  <figcaption>
                    {item.title} / {item.image}
                  </figcaption>
                </figure>
              ))}
            </div>
          </article>

          <article className="preview-card">
            <h3>projects</h3>
            <ul>
              {preview.projects.map((item) => (
                <li key={item.slug}>
                  {item.title} / {item.year}
                </li>
              ))}
            </ul>
          </article>

          <article className="preview-card">
            <h3>moodboard</h3>
            <ul>
              {preview.moods.map((item) => (
                <li key={item.id}>
                  {item.title} / {item.type}
                </li>
              ))}
            </ul>
          </article>

          <article className={`preview-card align-${preview.textAlign}`}>
            <h3>utility copy</h3>
            <p>project back label: {preview.projectDetail?.backLabel}</p>
            <p>not found title: {preview.notFound?.title}</p>
            <p>{preview.notFound?.message}</p>
            <p>not found back label: {preview.notFound?.backLabel}</p>
          </article>
        </aside>
      </div>
    </section>
  );
}
