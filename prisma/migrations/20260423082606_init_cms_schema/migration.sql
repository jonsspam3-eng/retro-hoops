-- CreateTable
CREATE TABLE "AdminUser" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "SiteConfig" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT DEFAULT 1,
    "siteName" TEXT NOT NULL,
    "siteTitle" TEXT NOT NULL,
    "siteDescription" TEXT NOT NULL,
    "logoPath" TEXT NOT NULL,
    "locationLabel" TEXT NOT NULL,
    "footerNote" TEXT NOT NULL,
    "primaryColor" TEXT NOT NULL,
    "backgroundColor" TEXT NOT NULL,
    "textColor" TEXT NOT NULL,
    "defaultTheme" TEXT NOT NULL,
    "textAlign" TEXT NOT NULL,
    "homeTextAlign" TEXT NOT NULL,
    "navigationLinks" JSONB NOT NULL,
    "homepageLinks" JSONB NOT NULL,
    "archiveBottomLinks" JSONB NOT NULL,
    "pageHeaders" JSONB NOT NULL,
    "projectDetailBackLabel" TEXT NOT NULL,
    "aboutParagraphs" JSONB NOT NULL,
    "aboutSections" JSONB NOT NULL,
    "contactIntro" TEXT NOT NULL,
    "contactCollaboration" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "socialLinks" JSONB NOT NULL,
    "notFoundTitle" TEXT NOT NULL,
    "notFoundMessage" TEXT NOT NULL,
    "notFoundBackLabel" TEXT NOT NULL,
    "photographyCategories" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Project" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "thumbnail" TEXT NOT NULL,
    "galleryImages" JSONB NOT NULL,
    "liveLink" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "MediaAsset" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT,
    "altText" TEXT,
    "collection" TEXT NOT NULL DEFAULT 'LIBRARY',
    "category" TEXT,
    "year" TEXT,
    "location" TEXT,
    "moodType" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "published" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_email_key" ON "AdminUser"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
