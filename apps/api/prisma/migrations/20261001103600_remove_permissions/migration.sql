-- DropForeignKey
ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "role_permissions_role_id_fkey";
ALTER TABLE "role_permissions" DROP CONSTRAINT IF EXISTS "role_permissions_permission_id_fkey";

-- DropTable
DROP TABLE IF EXISTS "role_permissions";
DROP TABLE IF EXISTS "permissions";
