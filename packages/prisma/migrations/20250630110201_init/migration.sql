/*
  Warnings:

  - You are about to drop the column `roundRobinHostsGroupId` on the `Host` table. All the data in the column will be lost.
  - You are about to drop the `RoundRobinHostsGroup` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Host" DROP CONSTRAINT "Host_roundRobinHostsGroupId_fkey";

-- DropForeignKey
ALTER TABLE "RoundRobinHostsGroup" DROP CONSTRAINT "RoundRobinHostsGroup_eventTypeId_fkey";

-- AlterTable
ALTER TABLE "Host" DROP COLUMN "roundRobinHostsGroupId";

-- DropTable
DROP TABLE "RoundRobinHostsGroup";
