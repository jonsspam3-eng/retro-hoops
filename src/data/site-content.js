/**
 * HOW TO EDIT THIS FILE
 * - This is the main content file for text and links.
 * - Non-technical edits should usually happen here.
 * - Update navigation labels, homepage links, about copy, contact info, and social links.
 */
export const siteContent = {
  siteTitle: "Creative portfolio",
  siteDescription:
    "Minimal editorial portfolio for photography, projects, moodboards, and creative archive work.",
  locationLabel: "NYC",

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

  footerNote: "nyc / independent practice",

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
    about: {
      title: "about",
    },
    contact: {
      title: "contact",
    },
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
};
