"use client";

import { useState } from "react";
import { useAdminToast } from "@/components/admin-cms/toast-context";

function toPrettyJson(value) {
  return JSON.stringify(value, null, 2);
}

function parseJsonArray(value) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function splitLines(value) {
  return String(value || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

export function SiteSectionForm({ section, initialData, endpoint }) {
  const { pushToast } = useAdminToast();
  const [form, setForm] = useState(() => {
    if (section === "homepage") {
      return {
        siteName: initialData.siteName || "",
        siteTitle: initialData.siteTitle || "",
        logoPath: initialData.logoPath || "",
        locationLabel: initialData.locationLabel || "",
        navigationLinks: toPrettyJson(initialData.navigationLinks || []),
        homepageLinks: toPrettyJson(initialData.homepageLinks || []),
        archiveBottomLinks: toPrettyJson(initialData.archiveBottomLinks || []),
        pageHeaders: toPrettyJson(initialData.pageHeaders || {}),
        projectDetailBackLabel: initialData.projectDetailBackLabel || "",
        photographyCategories: toPrettyJson(initialData.photographyCategories || []),
      };
    }

    if (section === "about") {
      return {
        pageHeaders: toPrettyJson(initialData.pageHeaders || {}),
        aboutParagraphs: (initialData.aboutParagraphs || []).join("\n"),
        aboutSections: toPrettyJson(initialData.aboutSections || []),
      };
    }

    if (section === "contact") {
      return {
        pageHeaders: toPrettyJson(initialData.pageHeaders || {}),
        contactIntro: initialData.contactIntro || "",
        contactCollaboration: initialData.contactCollaboration || "",
        contactEmail: initialData.contactEmail || "",
        socialLinks: toPrettyJson(initialData.socialLinks || []),
      };
    }

    return {
      siteDescription: initialData.siteDescription || "",
      footerNote: initialData.footerNote || "",
      primaryColor: initialData.primaryColor || "#a13a3a",
      backgroundColor: initialData.backgroundColor || "#0a0a0a",
      textColor: initialData.textColor || "#f2f2f2",
      defaultTheme: initialData.defaultTheme || "dark",
      textAlign: initialData.textAlign || "left",
      homeTextAlign: initialData.homeTextAlign || "center",
      notFoundTitle: initialData.notFoundTitle || "",
      notFoundMessage: initialData.notFoundMessage || "",
      notFoundBackLabel: initialData.notFoundBackLabel || "",
    };
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  function updateField(name, value) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function endpointForSection() {
    if (endpoint) {
      return endpoint;
    }
    if (section === "homepage") {
      return "/api/admin/site/homepage";
    }
    if (section === "about") {
      return "/api/admin/site/about";
    }
    if (section === "contact") {
      return "/api/admin/site/contact";
    }
    return "/api/admin/site/settings";
  }

  function buildPayload() {
    if (section === "homepage") {
      return {
        siteName: form.siteName,
        siteTitle: form.siteTitle,
        logoPath: form.logoPath,
        locationLabel: form.locationLabel,
        navigationLinks: parseJsonArray(form.navigationLinks),
        homepageLinks: parseJsonArray(form.homepageLinks),
        archiveBottomLinks: parseJsonArray(form.archiveBottomLinks),
        pageHeaders: JSON.parse(form.pageHeaders || "{}"),
        projectDetailBackLabel: form.projectDetailBackLabel,
        photographyCategories: parseJsonArray(form.photographyCategories),
      };
    }

    if (section === "about") {
      return {
        pageHeaders: JSON.parse(form.pageHeaders || "{}"),
        aboutParagraphs: splitLines(form.aboutParagraphs),
        aboutSections: parseJsonArray(form.aboutSections),
      };
    }

    if (section === "contact") {
      return {
        pageHeaders: JSON.parse(form.pageHeaders || "{}"),
        contactIntro: form.contactIntro,
        contactCollaboration: form.contactCollaboration,
        contactEmail: form.contactEmail,
        socialLinks: parseJsonArray(form.socialLinks),
      };
    }

    return {
      siteDescription: form.siteDescription,
      footerNote: form.footerNote,
      primaryColor: form.primaryColor,
      backgroundColor: form.backgroundColor,
      textColor: form.textColor,
      defaultTheme: form.defaultTheme,
      textAlign: form.textAlign,
      homeTextAlign: form.homeTextAlign,
      notFoundTitle: form.notFoundTitle,
      notFoundMessage: form.notFoundMessage,
      notFoundBackLabel: form.notFoundBackLabel,
    };
  }

  async function submit(event) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(endpointForSection(), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildPayload()),
      });
      const result = await response.json();
      if (!response.ok || result?.ok === false) {
        throw new Error(result?.error || "Failed to save changes.");
      }
      setMessage("Saved.");
      pushToast({
        title: "Section saved",
        message: `${section} settings updated.`,
      });
    } catch (submitError) {
      setError(submitError.message || "Failed to save changes.");
      pushToast({
        title: "Save failed",
        message: submitError.message || "Failed to save changes.",
        tone: "error",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="admin-form-grid" onSubmit={submit}>
      {section === "homepage" ? (
        <>
          <label className="admin-field">
            <span>site name</span>
            <input
              value={form.siteName}
              onChange={(event) => updateField("siteName", event.target.value)}
            />
          </label>
          <label className="admin-field">
            <span>site title</span>
            <input
              value={form.siteTitle}
              onChange={(event) => updateField("siteTitle", event.target.value)}
            />
          </label>
          <label className="admin-field">
            <span>logo path</span>
            <input
              value={form.logoPath}
              onChange={(event) => updateField("logoPath", event.target.value)}
            />
          </label>
          <label className="admin-field">
            <span>location label</span>
            <input
              value={form.locationLabel}
              onChange={(event) => updateField("locationLabel", event.target.value)}
            />
          </label>
          <label className="admin-field admin-field-full">
            <span>navigation links (JSON array)</span>
            <textarea
              rows={7}
              value={form.navigationLinks}
              onChange={(event) => updateField("navigationLinks", event.target.value)}
            />
          </label>
          <label className="admin-field admin-field-full">
            <span>homepage links (JSON array)</span>
            <textarea
              rows={7}
              value={form.homepageLinks}
              onChange={(event) => updateField("homepageLinks", event.target.value)}
            />
          </label>
          <label className="admin-field admin-field-full">
            <span>archive bottom links (JSON array)</span>
            <textarea
              rows={7}
              value={form.archiveBottomLinks}
              onChange={(event) => updateField("archiveBottomLinks", event.target.value)}
            />
          </label>
          <label className="admin-field admin-field-full">
            <span>page headers (JSON object)</span>
            <textarea
              rows={10}
              value={form.pageHeaders}
              onChange={(event) => updateField("pageHeaders", event.target.value)}
            />
          </label>
          <label className="admin-field">
            <span>project detail back label</span>
            <input
              value={form.projectDetailBackLabel}
              onChange={(event) =>
                updateField("projectDetailBackLabel", event.target.value)
              }
            />
          </label>
          <label className="admin-field admin-field-full">
            <span>photography categories (JSON array)</span>
            <textarea
              rows={6}
              value={form.photographyCategories}
              onChange={(event) => updateField("photographyCategories", event.target.value)}
            />
          </label>
        </>
      ) : null}

      {section === "about" ? (
        <>
          <label className="admin-field admin-field-full">
            <span>page headers (JSON object)</span>
            <textarea
              rows={10}
              value={form.pageHeaders}
              onChange={(event) => updateField("pageHeaders", event.target.value)}
            />
          </label>
          <label className="admin-field admin-field-full">
            <span>about paragraphs (one paragraph per line)</span>
            <textarea
              rows={8}
              value={form.aboutParagraphs}
              onChange={(event) => updateField("aboutParagraphs", event.target.value)}
            />
          </label>
          <label className="admin-field admin-field-full">
            <span>about sections (JSON array)</span>
            <textarea
              rows={12}
              value={form.aboutSections}
              onChange={(event) => updateField("aboutSections", event.target.value)}
            />
          </label>
        </>
      ) : null}

      {section === "contact" ? (
        <>
          <label className="admin-field admin-field-full">
            <span>page headers (JSON object)</span>
            <textarea
              rows={10}
              value={form.pageHeaders}
              onChange={(event) => updateField("pageHeaders", event.target.value)}
            />
          </label>
          <label className="admin-field admin-field-full">
            <span>contact intro</span>
            <textarea
              rows={4}
              value={form.contactIntro}
              onChange={(event) => updateField("contactIntro", event.target.value)}
            />
          </label>
          <label className="admin-field admin-field-full">
            <span>contact collaboration line</span>
            <textarea
              rows={3}
              value={form.contactCollaboration}
              onChange={(event) => updateField("contactCollaboration", event.target.value)}
            />
          </label>
          <label className="admin-field">
            <span>contact email</span>
            <input
              value={form.contactEmail}
              onChange={(event) => updateField("contactEmail", event.target.value)}
            />
          </label>
          <label className="admin-field admin-field-full">
            <span>social links (JSON array)</span>
            <textarea
              rows={10}
              value={form.socialLinks}
              onChange={(event) => updateField("socialLinks", event.target.value)}
            />
          </label>
        </>
      ) : null}

      {section === "settings" ? (
        <>
          <label className="admin-field admin-field-full">
            <span>site description</span>
            <textarea
              rows={4}
              value={form.siteDescription}
              onChange={(event) => updateField("siteDescription", event.target.value)}
            />
          </label>
          <label className="admin-field">
            <span>footer note</span>
            <input
              value={form.footerNote}
              onChange={(event) => updateField("footerNote", event.target.value)}
            />
          </label>
          <label className="admin-field">
            <span>primary color</span>
            <input
              value={form.primaryColor}
              onChange={(event) => updateField("primaryColor", event.target.value)}
            />
          </label>
          <label className="admin-field">
            <span>background color</span>
            <input
              value={form.backgroundColor}
              onChange={(event) => updateField("backgroundColor", event.target.value)}
            />
          </label>
          <label className="admin-field">
            <span>text color</span>
            <input
              value={form.textColor}
              onChange={(event) => updateField("textColor", event.target.value)}
            />
          </label>
          <label className="admin-field">
            <span>default theme</span>
            <select
              value={form.defaultTheme}
              onChange={(event) => updateField("defaultTheme", event.target.value)}
            >
              <option value="dark">dark</option>
              <option value="light">light</option>
            </select>
          </label>
          <label className="admin-field">
            <span>text align</span>
            <select
              value={form.textAlign}
              onChange={(event) => updateField("textAlign", event.target.value)}
            >
              <option value="left">left</option>
              <option value="center">center</option>
              <option value="right">right</option>
            </select>
          </label>
          <label className="admin-field">
            <span>home text align</span>
            <select
              value={form.homeTextAlign}
              onChange={(event) => updateField("homeTextAlign", event.target.value)}
            >
              <option value="left">left</option>
              <option value="center">center</option>
              <option value="right">right</option>
            </select>
          </label>
          <label className="admin-field">
            <span>not found title</span>
            <input
              value={form.notFoundTitle}
              onChange={(event) => updateField("notFoundTitle", event.target.value)}
            />
          </label>
          <label className="admin-field admin-field-full">
            <span>not found message</span>
            <textarea
              rows={4}
              value={form.notFoundMessage}
              onChange={(event) => updateField("notFoundMessage", event.target.value)}
            />
          </label>
          <label className="admin-field">
            <span>not found back label</span>
            <input
              value={form.notFoundBackLabel}
              onChange={(event) => updateField("notFoundBackLabel", event.target.value)}
            />
          </label>
        </>
      ) : null}

      <button type="submit" className="admin-save" disabled={saving}>
        {saving ? "saving..." : "save changes"}
      </button>

      {message ? <p className="admin-message is-saved">{message}</p> : null}
      {error ? <p className="admin-message is-error">{error}</p> : null}
    </form>
  );
}
