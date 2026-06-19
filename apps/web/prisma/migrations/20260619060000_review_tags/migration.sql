-- Tags padronizadas na avaliação (chips marcados por papel).
ALTER TABLE "Review" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT '{}';
