import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { unstable_noStore as noStore } from "next/cache";

const CONTENT_FILE_PATH = path.join(process.cwd(), "src/data/content-store.json");
const ADMIN_COOKIE_NAME = "portfolio_admin_session";
const VALID_TEXT_ALIGNMENTS = ["left", "center", "right"];

function parseJsonOrFallback(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function ensureArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

function sanitizeTextAlignment(value, fallback) {
  const normalized = String(value ?? "").trim().toLowerCase();
  return VALID_TEXT_ALIGNMENTS.includes(normalized) ? normalized : fallback;
}

function sanitizeLinkItems(items) {
  return ensureArray(items).map((item = {}) => ({
    href: String(item.href ?? "").trim() || "/",
    label: String(item.label ?? "").trim() || "untitled",
  }));
}

function sanitizeSocialItems(items) {
  return ensureArray(items).map((item = {}) => ({
    href: String(item.href ?? "").trim() || "https://example.com",
    label: String(item.label ?? "").trim() || "social",
    handle: String(item.handle ?? "").trim(),
  }));
}

function sanitizeAboutSections(items) {
  return ensureArray(items).map((item = {}) => ({
    title: String(item.title ?? "").trim() || "section",
    text: String(item.text ?? "").trim(),
  }));
}

function sanitizePhotographyItems(items) {
  return ensureArray(items).map((item = {}, index) => ({
    id: String(item.id ?? "").trim() || `ph-${String(index + 1).padStart(3, "0")}`,
    title: String(item.title ?? "").trim() || "Untitled",
    category: String(item.category ?? "").trim() || "all",
    year: String(item.year ?? "").trim(),
    location: String(item.location ?? "").trim(),
    image: String(item.image ?? "").trim() || "/images/photography/placeholder-a.svg",
  }));
}

function sanitizeProjectItems(items) {
  return ensureArray(items).map((item = {}, index) => ({
    slug:
      String(item.slug ?? "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, "-") || `project-${index + 1}`,
    title: String(item.title ?? "").trim() || "Untitled project",
    year: String(item.year ?? "").trim(),
    discipline: String(item.discipline ?? "").trim() || "Creative",
    summary: String(item.summary ?? "").trim(),
    image: String(item.image ?? "").trim() || "/images/projects/placeholder-landscape-a.svg",
    detail: String(item.detail ?? "").trim(),
  }));
}

function sanitizeMoodboardItems(items) {
  return ensureArray(items).map((item = {}, index) => ({
    id: String(item.id ?? "").trim() || `mb-${String(index + 1).padStart(3, "0")}`,
    title: String(item.title ?? "").trim() || "Untitled",
    type: String(item.type ?? "").trim() || "reference",
    image: String(item.image ?? "").trim() || "/images/moodboard/placeholder-square-a.svg",
  }));
}

export const defaultContentStore = {
  site: {
    siteName: "archive_13",
    siteTitle: "Creative portfolio",
    siteDescription:
      "Minimal editorial portfolio for photography, projects, moodboards, and creative archive work.",
    logoPath: "/images/logo/site-logo.svg",
    locationLabel: "NYC",
    footerNote: "nyc / independent practice",
    primaryColor: "#a13a3a",
    backgroundColor: "#0a0a0a",
    textColor: "#f2f2f2",
    defaultTheme: "dark",
    textAlign: "left",
    homeTextAlign: "center",
  },
  navigationLinks: [
    { href: "/photography", label: "photography" },
    { href: "/moodboard", label: "moodboard" },
    { href: "/projects", label: "projects" },
    { href: "/about", label: "about" },
    { href: "/contact", label: "contact" },
  ],
  homepageLinks: [
    { href: "/photography", label: "photography" },
    { href: "/moodboard", label: "moodboard" },
    { href: "/projects", label: "projects" },
    { href: "/about", label: "about" },
    { href: "/contact", label: "contact" },
  ],
  archiveBottomLinks: [
    { href: "/projects", label: "view all" },
    { href: "/moodboard", label: "archive" },
    { href: "/", label: "index" },
    { href: "/contact", label: "contact" },
  ],
  socialLinks: [
    { href: "https://instagram.com", label: "instagram", handle: "@archive_13" },
    { href: "https://are.na", label: "are.na", handle: "are.na/archive13" },
    { href: "https://vimeo.com", label: "vimeo", handle: "vimeo.com/archive13" },
  ],
  pageHeaders: {
    photography: {
      title: "photography",
      description: "selected frames / ongoing visual archive",
    },
    moodboard: {
      title: "moodboard",
      description: "editorials, textures, references, and found fragments",
    },
    projects: {
      title: "projects",
      description: "campaigns, editorial systems, and personal studies",
    },
    about: { title: "about" },
    contact: { title: "contact" },
  },
  projectDetail: {
    backLabel: "back to projects",
  },
  about: {
    paragraphs: [
      "Independent creative based in New York, working across photography, art direction, and archival design systems. My practice is focused on restraint, sequencing, and visual tone.",
      "I build image-led stories for fashion-adjacent brands, publications, and personal research projects.",
    ],
    sections: [
      {
        title: "selected clients / collaborators",
        text: "studio monolith, new chapter, district press, northline, other room",
      },
      {
        title: "interests",
        text: "print ephemera, transit signage, garment research, vernacular typography, city textures",
      },
    ],
  },
  contact: {
    intro: "Open to commissions, collaborations, and visual research projects.",
    collaborationLine: "For project inquiries, reach out by email or social.",
    email: "hello@archive13.studio",
  },
  notFound: {
    title: "not found",
    message: "The page you requested is not available in this archive.",
    backLabel: "return to index",
  },
  photographyCategories: ["all", "editorial", "street", "studio", "travel"],
  photographyItems: [],
  projects: [],
  moodboardItems: [],
};

export function normalizeContentStore(rawContent) {
  const input = rawContent ?? {};
  const site = input.site ?? {};
  const pageHeaders = input.pageHeaders ?? {};
  const about = input.about ?? {};
  const contact = input.contact ?? {};
  const notFound = input.notFound ?? {};
  const projectDetail = input.projectDetail ?? {};

  return {
    site: {
      siteName: String(site.siteName ?? defaultContentStore.site.siteName).trim(),
      siteTitle: String(site.siteTitle ?? defaultContentStore.site.siteTitle).trim(),
      siteDescription: String(
        site.siteDescription ?? defaultContentStore.site.siteDescription,
      ).trim(),
      logoPath: String(site.logoPath ?? defaultContentStore.site.logoPath).trim(),
      locationLabel: String(
        site.locationLabel ?? defaultContentStore.site.locationLabel,
      ).trim(),
      footerNote: String(site.footerNote ?? defaultContentStore.site.footerNote).trim(),
      primaryColor: String(
        site.primaryColor ?? defaultContentStore.site.primaryColor,
      ).trim(),
      backgroundColor: String(
        site.backgroundColor ?? defaultContentStore.site.backgroundColor,
      ).trim(),
      textColor: String(site.textColor ?? defaultContentStore.site.textColor).trim(),
      defaultTheme:
        site.defaultTheme === "light" || site.defaultTheme === "dark"
          ? site.defaultTheme
          : defaultContentStore.site.defaultTheme,
      textAlign: sanitizeTextAlignment(
        site.textAlign,
        defaultContentStore.site.textAlign,
      ),
      homeTextAlign: sanitizeTextAlignment(
        site.homeTextAlign,
        defaultContentStore.site.homeTextAlign,
      ),
    },
    navigationLinks: sanitizeLinkItems(input.navigationLinks),
    homepageLinks: sanitizeLinkItems(input.homepageLinks),
    archiveBottomLinks: sanitizeLinkItems(input.archiveBottomLinks),
    socialLinks: sanitizeSocialItems(input.socialLinks),
    pageHeaders: {
      photography: {
        title: String(
          pageHeaders.photography?.title ??
            defaultContentStore.pageHeaders.photography.title,
        ).trim(),
        description: String(
          pageHeaders.photography?.description ??
            defaultContentStore.pageHeaders.photography.description,
        ).trim(),
      },
      moodboard: {
        title: String(
          pageHeaders.moodboard?.title ?? defaultContentStore.pageHeaders.moodboard.title,
        ).trim(),
        description: String(
          pageHeaders.moodboard?.description ??
            defaultContentStore.pageHeaders.moodboard.description,
        ).trim(),
      },
      projects: {
        title: String(
          pageHeaders.projects?.title ?? defaultContentStore.pageHeaders.projects.title,
        ).trim(),
        description: String(
          pageHeaders.projects?.description ??
            defaultContentStore.pageHeaders.projects.description,
        ).trim(),
      },
      about: {
        title: String(
          pageHeaders.about?.title ?? defaultContentStore.pageHeaders.about.title,
        ).trim(),
      },
      contact: {
        title: String(
          pageHeaders.contact?.title ?? defaultContentStore.pageHeaders.contact.title,
        ).trim(),
      },
    },
    projectDetail: {
      backLabel: String(
        projectDetail.backLabel ?? defaultContentStore.projectDetail.backLabel,
      ).trim(),
    },
    about: {
      paragraphs: ensureArray(about.paragraphs).map((paragraph) => String(paragraph ?? "")),
      sections: sanitizeAboutSections(about.sections),
    },
    contact: {
      intro: String(contact.intro ?? defaultContentStore.contact.intro).trim(),
      collaborationLine: String(
        contact.collaborationLine ?? defaultContentStore.contact.collaborationLine,
      ).trim(),
      email: String(contact.email ?? defaultContentStore.contact.email).trim(),
    },
    notFound: {
      title: String(notFound.title ?? defaultContentStore.notFound.title).trim(),
      message: String(notFound.message ?? defaultContentStore.notFound.message).trim(),
      backLabel: String(
        notFound.backLabel ?? defaultContentStore.notFound.backLabel,
      ).trim(),
    },
    photographyCategories: ensureArray(input.photographyCategories).map((category) =>
      String(category ?? "").trim(),
    ),
    photographyItems: sanitizePhotographyItems(input.photographyItems),
    projects: sanitizeProjectItems(input.projects),
    moodboardItems: sanitizeMoodboardItems(input.moodboardItems),
  };
}

export async function readContentStore() {
  try {
    const fileValue = await fs.readFile(CONTENT_FILE_PATH, "utf8");
    const parsed = parseJsonOrFallback(fileValue, defaultContentStore);
    return normalizeContentStore(parsed);
  } catch {
    return normalizeContentStore(defaultContentStore);
  }
}

export async function writeContentStore(nextContent) {
  const normalized = normalizeContentStore(nextContent);
  await fs.writeFile(CONTENT_FILE_PATH, `${JSON.stringify(normalized, null, 2)}\n`, "utf8");
  return normalized;
}

export async function getContentStore() {
  noStore();
  return readContentStore();
}

export function isLocalAdminEnabled() {
  return (
    process.env.NODE_ENV !== "production" ||
    process.env.ENABLE_LOCAL_ADMIN === "true"
  );
}

function getAdminPassword() {
  return String(process.env.ADMIN_PASSWORD ?? "").trim();
}

function getAdminSessionToken() {
  const password = getAdminPassword();
  if (!password) {
    return "";
  }

  return crypto.createHash("sha256").update(password).digest("hex");
}

export function getAdminCookieName() {
  return ADMIN_COOKIE_NAME;
}

export function isAdminPasswordRequired() {
  return Boolean(getAdminPassword());
}

export function verifyAdminPassword(candidatePassword) {
  const expected = getAdminSessionToken();
  if (!expected) {
    return true;
  }

  const candidate = crypto
    .createHash("sha256")
    .update(String(candidatePassword ?? ""))
    .digest("hex");
  return candidate === expected;
}

export function isAdminSessionValid(cookieValue) {
  const expected = getAdminSessionToken();
  if (!expected) {
    return true;
  }

  return String(cookieValue ?? "") === expected;
}

export function getAdminSessionCookieValue() {
  return getAdminSessionToken();
}

