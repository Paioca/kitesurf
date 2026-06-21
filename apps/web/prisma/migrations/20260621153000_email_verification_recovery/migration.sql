-- E-mail verificado e recuperação segura de telefone.
CREATE TYPE "EmailTokenPurpose" AS ENUM ('verify', 'recovery');

ALTER TABLE "User"
  ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "OtpCode"
  ADD COLUMN "context" TEXT NOT NULL DEFAULT 'login';

CREATE TABLE "EmailToken" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "purpose" "EmailTokenPurpose" NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailToken_tokenHash_key" ON "EmailToken"("tokenHash");
CREATE INDEX "EmailToken_userId_purpose_idx" ON "EmailToken"("userId", "purpose");
CREATE INDEX "EmailToken_email_purpose_idx" ON "EmailToken"("email", "purpose");
CREATE INDEX "OtpCode_phone_context_idx" ON "OtpCode"("phone", "context");

ALTER TABLE "EmailToken"
  ADD CONSTRAINT "EmailToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
