-- AlterTable
ALTER TABLE "RoundRobinHostsGroup" ADD COLUMN     "assignAllTeamMembers" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRRWeightsEnabled" BOOLEAN NOT NULL DEFAULT false;
