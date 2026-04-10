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

function updateRow(setter, path, index, field, value) {
  setter((prev) => {
    const next = clone(prev);
    const list = next[path];
    list[index][field] = value;
    return next;
  });
}

function removeRow(setter, path, index) {
  setter((prev) => {
    const next = clone(prev);
    next[path].splice(index, 1);
    return next;
  });
}

function addRow(setter, path, template) {
  setter((prev) => {
    const next = clone(prev);
    next[path].push(clone(template));
    return next;
  });
}

function TextInput({ label, value, onChange, placeholder = "" }) {
  return (
    <label className="admin-field">
      <span>{label}</span>
      <input value={value ?? ""} onChange={onChange} placeholder={placeholder} />
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

export function AdminEditor({ initialContent }) {
  const [content, setContent] = useState(() => clone(initialContent));
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const preview = useMemo(() => {
    return {
      siteName: content.site?.siteName ?? "",
      siteTitle: content.site?.siteTitle ?? "",
      logoPath: content.site?.logoPath ?? "",
      homeLinks: ensureArray(content.homepageLinks).slice(0, 5),
      aboutParagraph: content.about?.paragraphs?.[0] ?? "",
      contactEmail: content.contact?.email ?? "",
    };
  }, [content]);

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
      setMessage("Saved. Refresh the site pages to see changes.");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "Unable to save changes.");
    }
  }

  return (
    <section className="admin-page">
      <header className="admin-header">
        <div>
          <h1>admin editor</h1>
          <p>Local-only content editing. Updates write to src/data/content-store.json.</p>
        </div>
        <button type="button" className="admin-save" onClick={saveContent}>
          {status === "saving" ? "saving..." : "save changes"}
        </button>
      </header>

      {message ? <p className={`admin-message is-${status}`}>{message}</p> : null}

      <div className="admin-grid">
        <section className="admin-panel">
          <h2>site / branding</h2>
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
          <h2>about / contact</h2>
          <TextArea
            label="about paragraph 1"
            rows={4}
            value={content.about.paragraphs?.[0] ?? ""}
            onChange={(event) =>
              setContent((prev) => {
                const next = clone(prev);
                next.about.paragraphs[0] = event.target.value;
                return next;
              })
            }
          />
          <TextArea
            label="about paragraph 2"
            rows={4}
            value={content.about.paragraphs?.[1] ?? ""}
            onChange={(event) =>
              setContent((prev) => {
                const next = clone(prev);
                next.about.paragraphs[1] = event.target.value;
                return next;
              })
            }
          />
          <TextArea
            label="about section 1"
            value={content.about.sections?.[0]?.text ?? ""}
            onChange={(event) =>
              setContent((prev) => {
                const next = clone(prev);
                next.about.sections[0].text = event.target.value;
                return next;
              })
            }
          />
          <TextArea
            label="about section 2"
            value={content.about.sections?.[1]?.text ?? ""}
            onChange={(event) =>
              setContent((prev) => {
                const next = clone(prev);
                next.about.sections[1].text = event.target.value;
                return next;
              })
            }
          />
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

        <section className="admin-panel admin-panel-wide">
          <h2>homepage navigation links</h2>
          <div className="admin-list">
            {ensureArray(content.homepageLinks).map((item, index) => (
              <div className="admin-row" key={`home-${index}-${item.href}`}>
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

          <h2>navigation links (top nav)</h2>
          <div className="admin-list">
            {ensureArray(content.navigationLinks).map((item, index) => (
              <div className="admin-row" key={`nav-${index}-${item.href}`}>
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
        </section>

        <section className="admin-panel admin-panel-wide">
          <h2>social links</h2>
          <div className="admin-list">
            {ensureArray(content.socialLinks).map((item, index) => (
              <div className="admin-row social-row" key={`social-${index}-${item.label}`}>
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
          <h2>photography items</h2>
          <TextInput
            label="categories (comma separated)"
            value={ensureArray(content.photographyCategories).join(", ")}
            onChange={(event) =>
              setContent((prev) => ({
                ...prev,
                photographyCategories: event.target.value
                  .split(",")
                  .map((item) => item.trim())
                  .filter(Boolean),
              }))
            }
            placeholder="all, editorial, street"
          />
          <div className="admin-list">
            {ensureArray(content.photographyItems).map((item, index) => (
              <div className="admin-row media-row" key={`photo-${index}-${item.id}`}>
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
          <h2>projects</h2>
          <div className="admin-list">
            {ensureArray(content.projects).map((item, index) => (
              <div className="admin-row media-row" key={`project-${index}-${item.slug}`}>
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
          <h2>moodboard items</h2>
          <div className="admin-list">
            {ensureArray(content.moodboardItems).map((item, index) => (
              <div className="admin-row media-row" key={`mood-${index}-${item.id}`}>
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

      <section className="admin-preview">
        <h2>quick preview</h2>
        <p>
          <strong>{preview.siteName}</strong> — {preview.siteTitle}
        </p>
        <p>logo: {preview.logoPath}</p>
        <p>email: {preview.contactEmail}</p>
        <p>about: {preview.aboutParagraph}</p>
        <ul>
          {preview.homeLinks.map((link) => (
            <li key={`${link.label}-${link.href}`}>
              {link.label} → {link.href}
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
