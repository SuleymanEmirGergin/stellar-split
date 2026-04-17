-- Migration: add_payment_requests_referral_savings
-- Adds PaymentRequest, SavingsPool, SavingsContribution models
-- and referral fields to User

-- ─── Referral fields on User ───────────────────────────────────────────────
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralCode"  TEXT UNIQUE DEFAULT gen_random_uuid()::text;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referredById"  TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "referralCount" INTEGER NOT NULL DEFAULT 0;

-- Back-fill existing users with a unique referral code
UPDATE "User" SET "referralCode" = gen_random_uuid()::text WHERE "referralCode" IS NULL;
ALTER TABLE "User" ALTER COLUMN "referralCode" SET NOT NULL;

-- FK: referredById → User.id
ALTER TABLE "User"
  ADD CONSTRAINT "User_referredById_fkey"
  FOREIGN KEY ("referredById") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "User_referralCode_idx" ON "User"("referralCode");

-- ─── PaymentRequest ───────────────────────────────────────────────────────
CREATE TYPE "PaymentRequestStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'EXPIRED');

CREATE TABLE IF NOT EXISTS "PaymentRequest" (
  "id"         TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "fromUserId" TEXT NOT NULL,
  "toUserId"   TEXT NOT NULL,
  "groupId"    TEXT NOT NULL,
  "amount"     DECIMAL(18,7) NOT NULL,
  "currency"   "Currency" NOT NULL DEFAULT 'XLM',
  "note"       TEXT,
  "dueDate"    TIMESTAMP(3),
  "status"     "PaymentRequestStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PaymentRequest_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "PaymentRequest"
  ADD CONSTRAINT "PaymentRequest_fromUserId_fkey"
  FOREIGN KEY ("fromUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentRequest"
  ADD CONSTRAINT "PaymentRequest_toUserId_fkey"
  FOREIGN KEY ("toUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PaymentRequest"
  ADD CONSTRAINT "PaymentRequest_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "PaymentRequest_fromUserId_idx" ON "PaymentRequest"("fromUserId");
CREATE INDEX IF NOT EXISTS "PaymentRequest_toUserId_idx"   ON "PaymentRequest"("toUserId");
CREATE INDEX IF NOT EXISTS "PaymentRequest_groupId_idx"    ON "PaymentRequest"("groupId");
CREATE INDEX IF NOT EXISTS "PaymentRequest_status_idx"     ON "PaymentRequest"("status");

-- ─── SavingsPool ──────────────────────────────────────────────────────────
CREATE TYPE "SavingsPoolStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'CANCELLED');

CREATE TABLE IF NOT EXISTS "SavingsPool" (
  "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "groupId"       TEXT NOT NULL,
  "createdById"   TEXT NOT NULL,
  "title"         TEXT NOT NULL,
  "goalAmount"    DECIMAL(18,7) NOT NULL,
  "currentAmount" DECIMAL(18,7) NOT NULL DEFAULT 0,
  "currency"      "Currency" NOT NULL DEFAULT 'XLM',
  "deadline"      TIMESTAMP(3),
  "status"        "SavingsPoolStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavingsPool_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SavingsPool"
  ADD CONSTRAINT "SavingsPool_groupId_fkey"
  FOREIGN KEY ("groupId") REFERENCES "Group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SavingsPool"
  ADD CONSTRAINT "SavingsPool_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "SavingsPool_groupId_idx" ON "SavingsPool"("groupId");
CREATE INDEX IF NOT EXISTS "SavingsPool_status_idx"  ON "SavingsPool"("status");

-- ─── SavingsContribution ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "SavingsContribution" (
  "id"        TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "poolId"    TEXT NOT NULL,
  "userId"    TEXT NOT NULL,
  "amount"    DECIMAL(18,7) NOT NULL,
  "note"      TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SavingsContribution_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "SavingsContribution"
  ADD CONSTRAINT "SavingsContribution_poolId_fkey"
  FOREIGN KEY ("poolId") REFERENCES "SavingsPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SavingsContribution"
  ADD CONSTRAINT "SavingsContribution_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "SavingsContribution_poolId_idx" ON "SavingsContribution"("poolId");
CREATE INDEX IF NOT EXISTS "SavingsContribution_userId_idx" ON "SavingsContribution"("userId");
