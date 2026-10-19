CREATE TABLE "judging_rubrics" (
 "id" TEXT NOT NULL PRIMARY KEY, "name" TEXT NOT NULL, "criteria" JSONB NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE "judging_assignments" (
 "id" TEXT NOT NULL PRIMARY KEY, "judgeId" TEXT NOT NULL, "teamId" TEXT NOT NULL,
 "rubricId" TEXT NOT NULL, "submissionVersion" INTEGER NOT NULL, "snapshot" JSONB NOT NULL,
 "scores" JSONB NOT NULL DEFAULT '{}', "feedback" TEXT NOT NULL DEFAULT '',
 "completed" BOOLEAN NOT NULL DEFAULT false, "version" INTEGER NOT NULL DEFAULT 1,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "judging_assignments_judgeId_fkey" FOREIGN KEY ("judgeId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "judging_assignments_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "judging_assignments_rubricId_fkey" FOREIGN KEY ("rubricId") REFERENCES "judging_rubrics"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "judging_assignments_judgeId_teamId_key" ON "judging_assignments"("judgeId", "teamId");
CREATE INDEX "judging_assignments_judgeId_completed_idx" ON "judging_assignments"("judgeId", "completed");
CREATE TABLE "judging_publications" (
 "id" TEXT NOT NULL PRIMARY KEY, "results" JSONB NOT NULL,
 "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
