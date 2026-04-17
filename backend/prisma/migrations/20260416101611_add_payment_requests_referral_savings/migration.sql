-- AlterTable
ALTER TABLE "DisputeVote" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "PaymentRequest" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SavingsContribution" ALTER COLUMN "id" DROP DEFAULT;

-- AlterTable
ALTER TABLE "SavingsPool" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "referralCode" DROP DEFAULT;
