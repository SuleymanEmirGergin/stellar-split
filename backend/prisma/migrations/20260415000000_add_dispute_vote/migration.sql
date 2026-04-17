-- CreateTable: DisputeVote
CREATE TABLE "DisputeVote" (
    "id"        TEXT NOT NULL DEFAULT gen_random_uuid(),
    "disputeId" TEXT NOT NULL,
    "voterId"   TEXT NOT NULL,
    "option"    TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DisputeVote_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DisputeVote_disputeId_voterId_key" UNIQUE ("disputeId","voterId")
);

-- AddForeignKey
ALTER TABLE "DisputeVote" ADD CONSTRAINT "DisputeVote_disputeId_fkey"
    FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DisputeVote" ADD CONSTRAINT "DisputeVote_voterId_fkey"
    FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "DisputeVote_disputeId_idx" ON "DisputeVote"("disputeId");
