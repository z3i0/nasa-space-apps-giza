CREATE TABLE "team_submissions" (
  "team_id" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT '',
  "summary" TEXT NOT NULL DEFAULT '',
  "challenge" TEXT NOT NULL DEFAULT '',
  "project_url" TEXT NOT NULL DEFAULT '',
  "repository_url" TEXT NOT NULL DEFAULT '',
  "demo_url" TEXT NOT NULL DEFAULT '',
  "status" "TeamSubmissionStatus" NOT NULL DEFAULT 'draft',
  "version" INTEGER NOT NULL DEFAULT 1,
  "submitted_at" TIMESTAMP(3),
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "team_submissions_pkey" PRIMARY KEY ("team_id"),
  CONSTRAINT "team_submissions_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
