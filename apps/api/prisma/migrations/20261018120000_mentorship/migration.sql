CREATE TYPE "MentorshipStatus" AS ENUM ('pending', 'accepted', 'declined', 'canceled', 'completed');

CREATE TABLE "mentor_profiles" (
  "user_id" TEXT NOT NULL PRIMARY KEY,
  "expertise" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "availability" TEXT NOT NULL DEFAULT '',
  "bio" TEXT NOT NULL DEFAULT '',
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mentor_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "mentorship_requests" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "team_id" TEXT NOT NULL,
  "mentor_id" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "session_notes" TEXT,
  "status" "MentorshipStatus" NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mentorship_requests_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "mentorship_requests_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "mentorship_requests_mentor_id_status_created_at_idx" ON "mentorship_requests"("mentor_id", "status", "created_at" DESC);
CREATE INDEX "mentorship_requests_team_id_created_at_idx" ON "mentorship_requests"("team_id", "created_at" DESC);

CREATE TABLE "mentorship_messages" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "request_id" TEXT NOT NULL,
  "sender_id" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "mentorship_messages_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "mentorship_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "mentorship_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "mentorship_messages_request_id_created_at_id_idx" ON "mentorship_messages"("request_id", "created_at" DESC, "id" DESC);

CREATE TABLE "mentor_slots" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "mentor_id" TEXT NOT NULL,
  "team_id" TEXT,
  "request_id" TEXT UNIQUE,
  "start_time" TIMESTAMP(3) NOT NULL,
  "end_time" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "mentor_slots_time_order_check" CHECK ("end_time" > "start_time"),
  CONSTRAINT "mentor_slots_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "mentor_slots_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "mentor_slots_request_id_fkey" FOREIGN KEY ("request_id") REFERENCES "mentorship_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "mentor_slots_mentor_id_start_time_idx" ON "mentor_slots"("mentor_id", "start_time");
