/*
  Warnings:

  - The primary key for the `RoundRobinHostsGroup` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE "Host" DROP CONSTRAINT "Host_roundRobinHostsGroupId_fkey";

-- AlterTable
ALTER TABLE "Host" ALTER COLUMN "roundRobinHostsGroupId" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "RoundRobinHostsGroup" DROP CONSTRAINT "RoundRobinHostsGroup_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "RoundRobinHostsGroup_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "RoundRobinHostsGroup_id_seq";

-- AddForeignKey
ALTER TABLE "Host" ADD CONSTRAINT "Host_roundRobinHostsGroupId_fkey" FOREIGN KEY ("roundRobinHostsGroupId") REFERENCES "RoundRobinHostsGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;
