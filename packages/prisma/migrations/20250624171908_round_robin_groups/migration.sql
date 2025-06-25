-- AlterTable
ALTER TABLE "Host" ADD COLUMN     "roundRobinGroupId" TEXT;

-- CreateTable
CREATE TABLE "RoundRobinGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "eventTypeId" INTEGER NOT NULL,

    CONSTRAINT "RoundRobinGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoundRobinGroup_eventTypeId_idx" ON "RoundRobinGroup"("eventTypeId");

-- AddForeignKey
ALTER TABLE "Host" ADD CONSTRAINT "Host_roundRobinGroupId_fkey" FOREIGN KEY ("roundRobinGroupId") REFERENCES "RoundRobinGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoundRobinGroup" ADD CONSTRAINT "RoundRobinGroup_eventTypeId_fkey" FOREIGN KEY ("eventTypeId") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;
