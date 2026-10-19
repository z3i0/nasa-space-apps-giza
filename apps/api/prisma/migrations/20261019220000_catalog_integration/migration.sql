CREATE TYPE "ResourceType" AS ENUM ('dataset', 'api', 'starter_code', 'video', 'tutorial', 'document', 'external_tool');
CREATE TYPE "ResourceLanguage" AS ENUM ('ar', 'en', 'both');
ALTER TABLE "challenges"
  ADD COLUMN "requirements_en" TEXT,
  ADD COLUMN "requirements_ar" TEXT,
  ADD COLUMN "deliverables_en" TEXT,
  ADD COLUMN "deliverables_ar" TEXT,
  ADD COLUMN "subjects" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "recommended_skills" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "nasa_challenge_id" TEXT,
  ADD COLUMN "display_order" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "profiles" ADD COLUMN "preferred_challenge_id" TEXT;
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_preferred_challenge_id_fkey" FOREIGN KEY ("preferred_challenge_id") REFERENCES "challenges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "profiles_preferred_challenge_id_idx" ON "profiles"("preferred_challenge_id");
ALTER TABLE "challenge_resources"
  ADD COLUMN "title_ar" TEXT,
  ADD COLUMN "description_en" TEXT,
  ADD COLUMN "description_ar" TEXT,
  ADD COLUMN "type" "ResourceType" NOT NULL DEFAULT 'dataset',
  ADD COLUMN "language" "ResourceLanguage" NOT NULL DEFAULT 'en',
  ADD COLUMN "is_official" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "is_curated" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "is_featured" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "metadata" JSONB,
  ADD COLUMN "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ADD COLUMN "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
