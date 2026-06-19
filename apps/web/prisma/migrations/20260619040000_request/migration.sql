-- CreateEnum
CREATE TYPE "RequestType" AS ENUM ('offer', 'visit');
CREATE TYPE "RequestStatus" AS ENUM ('pending', 'accepted', 'declined');
-- CreateTable
CREATE TABLE "Request" (
    "id" TEXT NOT NULL,
    "listingId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "type" "RequestType" NOT NULL,
    "amount" INTEGER,
    "status" "RequestStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Request_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Request_listingId_buyerId_type_key" ON "Request"("listingId", "buyerId", "type");
CREATE INDEX "Request_sellerId_idx" ON "Request"("sellerId");
CREATE INDEX "Request_buyerId_idx" ON "Request"("buyerId");
ALTER TABLE "Request" ADD CONSTRAINT "Request_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Request" ADD CONSTRAINT "Request_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Request" ADD CONSTRAINT "Request_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Request" ENABLE ROW LEVEL SECURITY;
