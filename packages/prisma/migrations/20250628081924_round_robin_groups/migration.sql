-- AlterTable
ALTER TABLE "Host" ADD COLUMN     "roundRobinHostsGroupId" INTEGER;

-- CreateTable
CREATE TABLE "RoundRobinHostsGroup" (
    "id" SERIAL NOT NULL,
    "eventTypeId" INTEGER NOT NULL,

    CONSTRAINT "RoundRobinHostsGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoundRobinHostsGroup_eventTypeId_idx" ON "RoundRobinHostsGroup"("eventTypeId");

-- AddForeignKey
ALTER TABLE "Host" ADD CONSTRAINT "Host_roundRobinHostsGroupId_fkey" FOREIGN KEY ("roundRobinHostsGroupId") REFERENCES "RoundRobinHostsGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundRobinHostsGroup" ADD CONSTRAINT "RoundRobinHostsGroup_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
