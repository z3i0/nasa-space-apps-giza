CREATE TABLE "role_applications" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "userId" TEXT NOT NULL,
 "role" TEXT NOT NULL,
 "status" TEXT NOT NULL DEFAULT 'pending',
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "reviewedAt" TIMESTAMP(3),
 "reviewedById" TEXT,
 "reason" TEXT NOT NULL DEFAULT '',
 CONSTRAINT "role_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "role_applications_role_check" CHECK ("role" IN ('mentor', 'judge')),
 CONSTRAINT "role_applications_status_check" CHECK ("status" IN ('pending', 'approved', 'rejected'))
);
CREATE UNIQUE INDEX "role_applications_userId_role_key" ON "role_applications"("userId", "role");
CREATE INDEX "role_applications_status_createdAt_idx" ON "role_applications"("status", "createdAt");
