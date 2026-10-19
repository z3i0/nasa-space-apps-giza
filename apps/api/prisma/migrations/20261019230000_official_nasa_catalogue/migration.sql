-- NASA publishes challenges; an organizer account is not their author.
ALTER TABLE "challenges" ALTER COLUMN "created_by_id" DROP NOT NULL;
