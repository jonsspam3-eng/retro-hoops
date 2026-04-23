import { cache } from "react";
import { prisma } from "@/lib/prisma";

const DEFAULT_PAGE_HEADERS = {
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
};

const DEFAULT_ABOUT = {
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
};

const DEFAULT_CONTACT = {
  intro: "Open to commissions, collaborations, and visual research projects.",
  collaborationLine: "For project inquiries, reach out by email or social.",
  email: "hello@archive13.studio",
};

const DEFAULT_SOCIAL = [
  { href: "https://instagram.com", label: "instagram", handle: "@archive_13" },
  { href: "https://are.na", label: "are.na", handle: "are.na/archive13" },
  { href: "https://vimeo.com", label: "vimeo", handle: "vimeo.com/archive13" },
];

const DEFAULT_NAV = [
  { href: "/photography", label: "photography" },
  { href: "/moodboard", label: "moodboard" },
  { href: "/projects", label: "projects" },
  { href: "/about", label: "about" },
  { href: "/contact", label: "contact" },
];

const DEFAULT_BOTTOM = [
  { href: "/projects", label: "view all" },
  { href: "/moodboard", label: "archive" },
  { href: "/", label: "index" },
  { href: "/contact", label: "contact" },
];

const DEFAULT_NOT_FOUND = {
  title: "not found",
  message: "The page you requested is not available in this archive.",
  backLabel: "return to index",
};

export function getCollectionFromCategory(category) {
  const normalized = String(category || "").toLowerCase();
  if (normalized === "photography") {
    return "PHOTOGRAPHY";
  }
  if (normalized === "moodboard") {
    return "MOODBOARD";
  }
  return "LIBRARY";
}

const DEFAULT_PHOTOGRAPHY_CATEGORIES = [
  "all",
  "editorial",
  "street",
  "studio",
  "travel",
];

function ensureArray(value, fallback = []) {
  return Array.isArray(value) ? value : fallback;
}

function normalizeSiteConfig(config) {
  return {
    id: config.id,
    siteName: config.siteName,
    siteTitle: config.siteTitle,
    siteDescription: config.siteDescription,
    logoPath: config.logoPath,
    locationLabel: config.locationLabel,
    footerNote: config.footerNote,
    primaryColor: config.primaryColor,
    backgroundColor: config.backgroundColor,
    textColor: config.textColor,
    defaultTheme: config.defaultTheme,
    textAlign: config.textAlign,
    homeTextAlign: config.homeTextAlign,
    navigationLinks: ensureArray(config.navigationLinks, DEFAULT_NAV),
    homepageLinks: ensureArray(config.homepageLinks, DEFAULT_NAV),
    archiveBottomLinks: ensureArray(config.archiveBottomLinks, DEFAULT_BOTTOM),
    pageHeaders: config.pageHeaders || DEFAULT_PAGE_HEADERS,
    projectDetailBackLabel: config.projectDetailBackLabel,
    about: {
      paragraphs: ensureArray(config.aboutParagraphs, DEFAULT_ABOUT.paragraphs),
      sections: ensureArray(config.aboutSections, DEFAULT_ABOUT.sections),
    },
    contact: {
      intro: config.contactIntro,
      collaborationLine: config.contactCollaboration,
      email: config.contactEmail,
    },
    socialLinks: ensureArray(config.socialLinks, DEFAULT_SOCIAL),
    notFound: {
      title: config.notFoundTitle,
      message: config.notFoundMessage,
      backLabel: config.notFoundBackLabel,
    },
    photographyCategories: ensureArray(
      config.photographyCategories,
      DEFAULT_PHOTOGRAPHY_CATEGORIES,
    ),
  };
}

async function ensureSiteConfig() {
  const existing = await prisma.siteConfig.findUnique({ where: { id: 1 } });
  if (existing) {
    return existing;
  }

  return prisma.siteConfig.create({
    data: {
      id: 1,
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
      navigationLinks: DEFAULT_NAV,
      homepageLinks: DEFAULT_NAV,
      archiveBottomLinks: DEFAULT_BOTTOM,
      pageHeaders: DEFAULT_PAGE_HEADERS,
      projectDetailBackLabel: "back to projects",
      aboutParagraphs: DEFAULT_ABOUT.paragraphs,
      aboutSections: DEFAULT_ABOUT.sections,
      contactIntro: DEFAULT_CONTACT.intro,
      contactCollaboration: DEFAULT_CONTACT.collaborationLine,
      contactEmail: DEFAULT_CONTACT.email,
      socialLinks: DEFAULT_SOCIAL,
      notFoundTitle: DEFAULT_NOT_FOUND.title,
      notFoundMessage: DEFAULT_NOT_FOUND.message,
      notFoundBackLabel: DEFAULT_NOT_FOUND.backLabel,
      photographyCategories: DEFAULT_PHOTOGRAPHY_CATEGORIES,
    },
  });
}

export const getSiteConfig = cache(async function getSiteConfig() {
  const config = await ensureSiteConfig();
  return normalizeSiteConfig(config);
});

function mapProject(project) {
  return {
    id: project.id,
    title: project.title,
    slug: project.slug,
    description: project.description,
    category: project.category,
    thumbnail: project.thumbnail,
    galleryImages: ensureArray(project.galleryImages, []),
    liveLink: project.liveLink || "",
    sortOrder: project.sortOrder,
    featured: project.featured,
    published: project.published,
  };
}

function mapMediaAsset(item) {
  return {
    id: item.id,
    title: item.title,
    url: item.url,
    publicId: item.publicId,
    altText: item.altText,
    collection: item.collection,
    category: item.category,
    year: item.year,
    location: item.location,
    moodType: item.moodType,
    sortOrder: item.sortOrder,
    featured: item.featured,
    published: item.published,
  };
}

export async function listProjects({ includeUnpublished = true } = {}) {
  const projects = await prisma.project.findMany({
    where: includeUnpublished ? {} : { published: true },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  return projects.map(mapProject);
}

export async function getProjectBySlug(slug) {
  const project = await prisma.project.findUnique({ where: { slug } });
  return project ? mapProject(project) : null;
}

export async function createProject(data) {
  const project = await prisma.project.create({
    data: {
      title: data.title,
      slug: data.slug,
      description: data.description,
      category: data.category,
      thumbnail: data.thumbnail,
      galleryImages: data.galleryImages || [],
      liveLink: data.liveLink || null,
      sortOrder: Number(data.sortOrder) || 0,
      featured: Boolean(data.featured),
      published: data.published !== false,
    },
  });
  return mapProject(project);
}

export async function updateProject(id, data) {
  const project = await prisma.project.update({
    where: { id: Number(id) },
    data: {
      title: data.title,
      slug: data.slug,
      description: data.description,
      category: data.category,
      thumbnail: data.thumbnail,
      galleryImages: data.galleryImages || [],
      liveLink: data.liveLink || null,
      sortOrder: Number(data.sortOrder) || 0,
      featured: Boolean(data.featured),
      published: Boolean(data.published),
    },
  });
  return mapProject(project);
}

export async function deleteProject(id) {
  return prisma.project.delete({ where: { id: Number(id) } });
}

export async function listMedia({ collection } = {}) {
  const where = collection ? { collection } : {};
  const media = await prisma.mediaAsset.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
  return media.map(mapMediaAsset);
}

export async function createMedia(data) {
  const media = await prisma.mediaAsset.create({
    data: {
      title: data.title,
      url: data.url,
      publicId: data.publicId || null,
      altText: data.altText || null,
      collection: data.collection || "LIBRARY",
      category: data.category || null,
      year: data.year || null,
      location: data.location || null,
      moodType: data.moodType || null,
      sortOrder: Number(data.sortOrder) || 0,
      featured: Boolean(data.featured),
      published: data.published !== false,
    },
  });
  return mapMediaAsset(media);
}

export async function updateMedia(id, data) {
  const media = await prisma.mediaAsset.update({
    where: { id: Number(id) },
    data: {
      title: data.title,
      url: data.url,
      altText: data.altText || null,
      collection: data.collection || "LIBRARY",
      category: data.category || null,
      year: data.year || null,
      location: data.location || null,
      moodType: data.moodType || null,
      sortOrder: Number(data.sortOrder) || 0,
      featured: Boolean(data.featured),
      published: Boolean(data.published),
    },
  });
  return mapMediaAsset(media);
}

export async function deleteMedia(id) {
  return prisma.mediaAsset.delete({ where: { id: Number(id) } });
}

export async function updateHomepageSection(payload) {
  return prisma.siteConfig.update({
    where: { id: 1 },
    data: {
      siteName: payload.siteName,
      siteTitle: payload.siteTitle,
      logoPath: payload.logoPath,
      locationLabel: payload.locationLabel,
      homepageLinks: payload.homepageLinks || DEFAULT_NAV,
      navigationLinks: payload.navigationLinks || DEFAULT_NAV,
      archiveBottomLinks: payload.archiveBottomLinks || DEFAULT_BOTTOM,
      pageHeaders: payload.pageHeaders || DEFAULT_PAGE_HEADERS,
      projectDetailBackLabel: payload.projectDetailBackLabel || "back to projects",
      photographyCategories:
        payload.photographyCategories || DEFAULT_PHOTOGRAPHY_CATEGORIES,
    },
  });
}

export async function updateAboutSection(payload) {
  return prisma.siteConfig.update({
    where: { id: 1 },
    data: {
      pageHeaders: payload.pageHeaders || DEFAULT_PAGE_HEADERS,
      aboutParagraphs: payload.aboutParagraphs || [],
      aboutSections: payload.aboutSections || [],
    },
  });
}

export async function updateContactSection(payload) {
  return prisma.siteConfig.update({
    where: { id: 1 },
    data: {
      pageHeaders: payload.pageHeaders || DEFAULT_PAGE_HEADERS,
      contactIntro: payload.contactIntro,
      contactCollaboration: payload.contactCollaboration,
      contactEmail: payload.contactEmail,
      socialLinks: payload.socialLinks || [],
    },
  });
}

export async function updateSiteSettings(payload) {
  return prisma.siteConfig.update({
    where: { id: 1 },
    data: {
      siteDescription: payload.siteDescription,
      footerNote: payload.footerNote,
      primaryColor: payload.primaryColor,
      backgroundColor: payload.backgroundColor,
      textColor: payload.textColor,
      defaultTheme: payload.defaultTheme,
      textAlign: payload.textAlign,
      homeTextAlign: payload.homeTextAlign,
      notFoundTitle: payload.notFoundTitle,
      notFoundMessage: payload.notFoundMessage,
      notFoundBackLabel: payload.notFoundBackLabel,
    },
  });
}

export async function getAdminDashboardStats() {
  const [projectCount, projectPublishedCount, featuredCount, mediaCount] =
    await Promise.all([
      prisma.project.count(),
      prisma.project.count({ where: { published: true } }),
      prisma.project.count({ where: { featured: true } }),
      prisma.mediaAsset.count(),
    ]);

  return {
    projectCount,
    projectPublishedCount,
    featuredCount,
    mediaCount,
  };
}

function normalizeSortOrder(items) {
  return items.map((item, index) => ({
    ...item,
    sortOrder: index,
  }));
}

export async function reorderProjects(ids) {
  const numericIds = ids.map((id) => Number(id)).filter((id) => Number.isFinite(id));
  const existing = await prisma.project.findMany({
    where: { id: { in: numericIds } },
    orderBy: { sortOrder: "asc" },
  });
  const ordered = normalizeSortOrder(
    numericIds
      .map((id) => existing.find((item) => item.id === id))
      .filter(Boolean),
  );

  await prisma.$transaction(
    ordered.map((item) =>
      prisma.project.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      }),
    ),
  );
}

export async function reorderMedia(ids) {
  const numericIds = ids.map((id) => Number(id)).filter((id) => Number.isFinite(id));
  const existing = await prisma.mediaAsset.findMany({
    where: { id: { in: numericIds } },
    orderBy: { sortOrder: "asc" },
  });
  const ordered = normalizeSortOrder(
    numericIds
      .map((id) => existing.find((item) => item.id === id))
      .filter(Boolean),
  );

  await prisma.$transaction(
    ordered.map((item) =>
      prisma.mediaAsset.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      }),
    ),
  );
}

export const getPublicContent = cache(async function getPublicContent() {
  const [siteConfig, projects, photos, moodboard] = await Promise.all([
    getSiteConfig(),
    listProjects({ includeUnpublished: false }),
    listMedia({ collection: "PHOTOGRAPHY" }),
    listMedia({ collection: "MOODBOARD" }),
  ]);

  const mappedProjects = projects
    .filter((project) => project.published)
    .map((project) => ({
      id: project.id,
      slug: project.slug,
      title: project.title,
      discipline: project.category,
      year: "",
      summary: project.description,
      detail: project.description,
      image: project.thumbnail,
      thumbnail: project.thumbnail,
      category: project.category,
      liveLink: project.liveLink || "",
      featured: project.featured,
      published: project.published,
      galleryImages: ensureArray(project.galleryImages, []),
    }));

  const mappedPhotography = photos
    .filter((item) => item.published)
    .map((item) => ({
      id: `ph-${item.id}`,
      title: item.title,
      category: item.category || "all",
      year: item.year || "",
      location: item.location || "",
      image: item.url,
    }));

  const mappedMoodboard = moodboard
    .filter((item) => item.published)
    .map((item) => ({
      id: `mb-${item.id}`,
      title: item.title,
      type: item.moodType || item.category || "reference",
      image: item.url,
    }));

  return {
    site: {
      siteName: siteConfig.siteName,
      siteTitle: siteConfig.siteTitle,
      siteDescription: siteConfig.siteDescription,
      logoPath: siteConfig.logoPath,
      locationLabel: siteConfig.locationLabel,
      footerNote: siteConfig.footerNote,
      primaryColor: siteConfig.primaryColor,
      backgroundColor: siteConfig.backgroundColor,
      textColor: siteConfig.textColor,
      defaultTheme: siteConfig.defaultTheme,
      textAlign: siteConfig.textAlign,
      homeTextAlign: siteConfig.homeTextAlign,
    },
    navigationLinks: siteConfig.navigationLinks,
    homepageLinks: siteConfig.homepageLinks,
    archiveBottomLinks: siteConfig.archiveBottomLinks,
    pageHeaders: siteConfig.pageHeaders,
    projectDetail: { backLabel: siteConfig.projectDetailBackLabel },
    about: siteConfig.about,
    contact: siteConfig.contact,
    socialLinks: siteConfig.socialLinks,
    notFound: siteConfig.notFound,
    photographyCategories: siteConfig.photographyCategories,
    photographyItems: mappedPhotography,
    projects: mappedProjects,
    moodboardItems: mappedMoodboard,
  };
});

export function mapMediaForAdmin(items) {
  return items.map(mapMediaAsset);
}

export function mapProjectsForAdmin(items) {
  return items.map(mapProject);
}

