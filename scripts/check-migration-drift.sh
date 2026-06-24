#!/usr/bin/env bash
#
# Barra PRs que alteram apps/web/prisma/schema.prisma SEM adicionar uma migration nova.
# DB-free: olha só o diff do Git entre a base do PR e HEAD.
#
# Uso:  scripts/check-migration-drift.sh <base-ref>
#   ex: scripts/check-migration-drift.sh origin/main
#
set -euo pipefail

BASE="${1:-}"
if [ -z "$BASE" ]; then
  echo "✗ uso: $0 <base-ref>   (ex: origin/main)" >&2
  exit 1
fi

SCHEMA="apps/web/prisma/schema.prisma"
MIGR_DIR="apps/web/prisma/migrations"

CHANGED="$(git diff --name-only "$BASE"...HEAD)"

if ! printf '%s\n' "$CHANGED" | grep -qx "$SCHEMA"; then
  echo "✓ schema.prisma não mudou neste PR — nada a checar."
  exit 0
fi

NEW_MIGRATIONS="$(git diff --name-only --diff-filter=A "$BASE"...HEAD -- "$MIGR_DIR" \
  | grep '/migration\.sql$' || true)"

if [ -n "$NEW_MIGRATIONS" ]; then
  echo "✓ schema.prisma mudou e há migration nova:"
  printf '%s\n' "$NEW_MIGRATIONS" | sed 's/^/    /'
  exit 0
fi

cat >&2 <<EOF
✗ schema.prisma foi alterado, mas NENHUMA migration nova foi adicionada em $MIGR_DIR.

  Gere a migration:
      cd apps/web && npm run db:migrate

  Se a mudança no schema for só comentário/formatação, reverta-a ou gere
  uma migration vazia com:
      cd apps/web && npx prisma migrate dev --create-only --name <nome>

  Regra: schema e migrations sempre evoluem juntos (expand -> migrate -> contract).
  Ver docs/MIGRATIONS.md
EOF
exit 1
