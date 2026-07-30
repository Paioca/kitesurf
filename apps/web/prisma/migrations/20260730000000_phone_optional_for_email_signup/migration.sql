-- Conta pode nascer por e-mail (sem telefone). O gate de negociação
-- (requireVerifiedUser) exige phone+email verificados antes de anunciar/solicitar.
ALTER TABLE "User" ALTER COLUMN "phone" DROP NOT NULL;
