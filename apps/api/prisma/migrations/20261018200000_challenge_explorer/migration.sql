CREATE TYPE "ChallengeDifficulty" AS ENUM ('beginner', 'intermediate', 'advanced');
CREATE TABLE "challenges" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "slug" TEXT NOT NULL UNIQUE,
  "title" TEXT NOT NULL,
  "title_ar" TEXT,
  "summary" TEXT NOT NULL,
  "summary_ar" TEXT,
  "description" TEXT NOT NULL,
  "description_ar" TEXT,
  "category" TEXT NOT NULL,
  "difficulty" "ChallengeDifficulty" NOT NULL,
  "year" INTEGER NOT NULL,
  "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "source_url" TEXT,
  "is_published" BOOLEAN NOT NULL DEFAULT false,
  "is_archived" BOOLEAN NOT NULL DEFAULT false,
  "is_demo" BOOLEAN NOT NULL DEFAULT false,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "challenges_year_check" CHECK ("year" BETWEEN 2000 AND 2100)
);
CREATE INDEX "challenges_is_published_is_archived_year_idx" ON "challenges"("is_published", "is_archived", "year" DESC);
CREATE INDEX "challenges_category_difficulty_idx" ON "challenges"("category", "difficulty");
CREATE TABLE "challenge_resources" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "challenge_id" TEXT NOT NULL REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "label" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "position" INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX "challenge_resources_challenge_id_position_idx" ON "challenge_resources"("challenge_id", "position");
CREATE TABLE "challenge_favorites" (
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "challenge_id" TEXT NOT NULL REFERENCES "challenges"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("user_id", "challenge_id")
);
CREATE INDEX "challenge_favorites_challenge_id_idx" ON "challenge_favorites"("challenge_id");
ALTER TABLE "teams" ADD COLUMN "challenge_id" TEXT;
ALTER TABLE "teams" ADD CONSTRAINT "teams_challenge_id_fkey" FOREIGN KEY ("challenge_id") REFERENCES "challenges"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "teams_challenge_id_idx" ON "teams"("challenge_id");
-- Keep the original free-text choice. Only unique, exact matches may be linked.
UPDATE "teams" t SET "challenge_id" = c."id" FROM "challenges" c
WHERE t."challenge_id" IS NULL AND lower(trim(t."challenge")) = lower(trim(c."title"))
AND (SELECT count(*) FROM "challenges" x WHERE lower(trim(x."title")) = lower(trim(t."challenge"))) = 1;
