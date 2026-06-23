-- AuditEvent: trilha append-only de ações irreversíveis/financeiras (LGPD + disputa).
CREATE TABLE "AuditEvent" (
  "id"            TEXT NOT NULL,
  "actorUserId"   TEXT,
  "action"        TEXT NOT NULL,
  "entityType"    TEXT NOT NULL,
  "entityId"      TEXT NOT NULL,
  "before"        JSONB,
  "after"         JSONB,
  "correlationId" TEXT,
  "ipHash"        TEXT,
  "userAgent"     TEXT,
  "release"       TEXT,
  "result"        TEXT NOT NULL DEFAULT 'ok',
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AuditEvent_entityType_entityId_createdAt_idx"
  ON "AuditEvent"("entityType", "entityId", "createdAt");
CREATE INDEX "AuditEvent_actorUserId_createdAt_idx"
  ON "AuditEvent"("actorUserId", "createdAt");
CREATE INDEX "AuditEvent_action_createdAt_idx"
  ON "AuditEvent"("action", "createdAt");

-- JobRun: sentinela de execução de jobs (cron e on-demand).
CREATE TABLE "JobRun" (
  "id"         TEXT NOT NULL,
  "job"        TEXT NOT NULL,
  "startedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "finishedAt" TIMESTAMP(3),
  "status"     TEXT NOT NULL,
  "result"     JSONB,
  "error"      TEXT,
  "release"    TEXT,
  CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobRun_job_startedAt_idx" ON "JobRun"("job", "startedAt");
CREATE INDEX "JobRun_status_startedAt_idx" ON "JobRun"("status", "startedAt");
