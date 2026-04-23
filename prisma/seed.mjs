import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || "admin@example.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "changeme123";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: { passwordHash },
    create: {
      email: adminEmail,
      name: "Portfolio Admin",
      passwordHash,
    },
  });
  await prisma.siteConfig.upsert({
    where: { id: 1 },
    update: {},
    create: {
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
      projectDetailBackLabel: "back to projects",
      aboutParagraphs: [
        "Independent creative based in New York, working across photography, art direction, and archival design systems. My practice is focused on restraint, sequencing, and visual tone.",
        "I build image-led stories for fashion-adjacent brands, publications, and personal research projects.",
      ],
      aboutSections: [
        {
          title: "selected clients / collaborators",
          text: "studio monolith, new chapter, district press, northline, other room",
        },
        {
          title: "interests",
          text: "print ephemera, transit signage, garment research, vernacular typography, city textures",
        },
      ],
      contactIntro: "Open to commissions, collaborations, and visual research projects.",
      contactCollaboration: "For project inquiries, reach out by email or social.",
      contactEmail: "hello@archive13.studio",
      socialLinks: [
        {
          href: "https://instagram.com",
          label: "instagram",
          handle: "@archive_13",
        },
        { href: "https://are.na", label: "are.na", handle: "are.na/archive13" },
        {
          href: "https://vimeo.com",
          label: "vimeo",
          handle: "vimeo.com/archive13",
        },
      ],
      notFoundTitle: "not found",
      notFoundMessage: "The page you requested is not available in this archive.",
      notFoundBackLabel: "return to index",
      photographyCategories: ["all", "editorial", "street", "studio", "travel"],
    },
  });

  const mediaCount = await prisma.mediaAsset.count();
  if (mediaCount === 0) {
    await prisma.mediaAsset.createMany({
      data: [
        {
          title: "Photo Placeholder A",
          url: "/images/photography/placeholder-a.svg",
          altText: "Photography placeholder",
          collection: "PHOTOGRAPHY",
          category: "editorial",
        },
        {
          title: "Project Placeholder A",
          url: "/images/projects/placeholder-landscape-a.svg",
          altText: "Project placeholder",
          collection: "LIBRARY",
          category: "project",
        },
        {
          title: "Moodboard Placeholder A",
          url: "/images/moodboard/placeholder-square-a.svg",
          altText: "Moodboard placeholder",
          collection: "MOODBOARD",
          category: "texture",
        },
      ],
    });
  }

  const photographyCount = await prisma.mediaAsset.count({
    where: { collection: "PHOTOGRAPHY" },
  });
  if (photographyCount === 0) {
    await prisma.mediaAsset.createMany({
      data: [
        {
          title: "Night Window",
          collection: "PHOTOGRAPHY",
          category: "editorial",
          year: "2026",
          location: "Lower East Side",
          url: "/images/photography/placeholder-a.svg",
          sortOrder: 0,
          published: true,
        },
        {
          title: "Transit Frame",
          collection: "PHOTOGRAPHY",
          category: "street",
          year: "2025",
          location: "Chinatown",
          url: "/images/photography/placeholder-b.svg",
          sortOrder: 1,
          published: true,
        },
      ],
    });
  }

  const moodboardCount = await prisma.mediaAsset.count({
    where: { collection: "MOODBOARD" },
  });
  if (moodboardCount === 0) {
    await prisma.mediaAsset.createMany({
      data: [
        {
          title: "Worn Cotton",
          collection: "MOODBOARD",
          type: "texture",
          moodType: "texture",
          url: "/images/moodboard/placeholder-square-a.svg",
          sortOrder: 0,
          published: true,
        },
        {
          title: "Blue Hour Block",
          collection: "MOODBOARD",
          moodType: "street frame",
          url: "/images/moodboard/placeholder-square-b.svg",
          sortOrder: 1,
          published: true,
        },
      ],
    });
  }

  const projectCount = await prisma.project.count();
  if (projectCount === 0) {
    await prisma.project.createMany({
      data: [
        {
          title: "Uniform Study",
          slug: "uniform-study",
          description:
            "A visual study on repetition, silhouette, and texture in functional garments.",
          category: "Art Direction",
          thumbnail: "/images/projects/placeholder-landscape-a.svg",
          galleryImages: ["/images/projects/placeholder-landscape-a.svg"],
          liveLink: "",
          sortOrder: 0,
          featured: true,
          published: true,
        },
        {
          title: "After Hours Issue",
          slug: "after-hours-issue",
          description:
            "Independent digital zine exploring nightlife typography and image sequencing.",
          category: "Editorial Design",
          thumbnail: "/images/projects/placeholder-landscape-b.svg",
          galleryImages: ["/images/projects/placeholder-landscape-b.svg"],
          liveLink: "",
          sortOrder: 1,
          featured: false,
          published: true,
        },
      ],
    });
  }

  console.log("Database seeded.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
