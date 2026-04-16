-- CreateEnum: BannerPosition
CREATE TYPE "BannerPosition" AS ENUM ('TOP', 'BOTTOM', 'FLOATING');

-- CreateEnum: PopupTrigger
CREATE TYPE "PopupTrigger" AS ENUM ('DELAY', 'EXIT_INTENT', 'SCROLL', 'PAGE_LOAD');

-- CreateEnum: FaqCategory
CREATE TYPE "FaqCategory" AS ENUM ('GENERAL', 'PRICING', 'TECHNICAL', 'SECURITY');

-- CreateEnum: InquiryPackage
CREATE TYPE "InquiryPackage" AS ENUM ('VPS_LICENSE', 'PAMM', 'SIGNAL', 'OTHER');

-- CreateEnum: InquiryStatus
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'IN_PROGRESS', 'CLOSED', 'REJECTED');

-- CreateTable: SiteSetting
CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'string',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SiteSetting_key_key" ON "SiteSetting"("key");

-- CreateTable: LandingSection
CREATE TABLE "LandingSection" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "content" JSONB NOT NULL DEFAULT '{}',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "LandingSection_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LandingSection_slug_key" ON "LandingSection"("slug");
CREATE INDEX "LandingSection_sortOrder_idx" ON "LandingSection"("sortOrder");

-- CreateTable: PricingTier
CREATE TABLE "PricingTier" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "subtitle" TEXT,
    "features" JSONB NOT NULL DEFAULT '[]',
    "excluded" JSONB NOT NULL DEFAULT '[]',
    "note" TEXT,
    "ctaLabel" TEXT NOT NULL DEFAULT 'Daftar',
    "ctaLink" TEXT NOT NULL DEFAULT '/register',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PricingTier_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PricingTier_slug_key" ON "PricingTier"("slug");
CREATE INDEX "PricingTier_sortOrder_idx" ON "PricingTier"("sortOrder");

-- CreateTable: Banner
CREATE TABLE "Banner" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "linkUrl" TEXT,
    "linkLabel" TEXT,
    "position" "BannerPosition" NOT NULL DEFAULT 'TOP',
    "bgColor" TEXT DEFAULT '#0ea5e9',
    "textColor" TEXT DEFAULT '#ffffff',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Banner_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Banner_isActive_startsAt_endsAt_idx" ON "Banner"("isActive", "startsAt", "endsAt");

-- CreateTable: Popup
CREATE TABLE "Popup" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "imageUrl" TEXT,
    "ctaLabel" TEXT,
    "ctaLink" TEXT,
    "trigger" "PopupTrigger" NOT NULL DEFAULT 'DELAY',
    "triggerValue" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Popup_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Popup_isActive_idx" ON "Popup"("isActive");

-- CreateTable: Faq
CREATE TABLE "Faq" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" "FaqCategory" NOT NULL DEFAULT 'GENERAL',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Faq_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Faq_category_sortOrder_idx" ON "Faq"("category", "sortOrder");

-- CreateTable: Testimonial
CREATE TABLE "Testimonial" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT,
    "content" TEXT NOT NULL,
    "rating" INTEGER NOT NULL DEFAULT 5,
    "avatarUrl" TEXT,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Testimonial_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Testimonial_isVisible_sortOrder_idx" ON "Testimonial"("isVisible", "sortOrder");

-- CreateTable: PageMeta
CREATE TABLE "PageMeta" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImage" TEXT,
    "structuredData" JSONB,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PageMeta_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PageMeta_path_key" ON "PageMeta"("path");

-- CreateTable: Inquiry
CREATE TABLE "Inquiry" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "company" TEXT,
    "package" "InquiryPackage" NOT NULL DEFAULT 'VPS_LICENSE',
    "message" TEXT NOT NULL,
    "status" "InquiryStatus" NOT NULL DEFAULT 'NEW',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Inquiry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Inquiry_status_createdAt_idx" ON "Inquiry"("status", "createdAt");
