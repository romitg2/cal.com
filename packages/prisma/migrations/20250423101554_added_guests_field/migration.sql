-- CreateTable
CREATE TABLE "_guest_eventtype" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_guest_eventtype_AB_unique" ON "_guest_eventtype"("A", "B");

-- CreateIndex
CREATE INDEX "_guest_eventtype_B_index" ON "_guest_eventtype"("B");

-- AddForeignKey
ALTER TABLE "_guest_eventtype" ADD CONSTRAINT "_guest_eventtype_A_fkey" FOREIGN KEY ("A") REFERENCES "EventType"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_guest_eventtype" ADD CONSTRAINT "_guest_eventtype_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
