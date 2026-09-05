#!/usr/bin/env bash
# Visual demo helpers: upload map + start campus stack (or print URLs only).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

ROOM_URL="${WA_ROOM_URL:-http://play.workadventure.localhost/~/campus/starter/map.wam}"
START="${CAMPUS_DEMO_START:-1}"

echo "== upload starter map (shared campus/) =="
bash scripts/wa/upload-starter-to-map-storage.sh

if [[ "$START" == "1" ]]; then
  echo "== stack-up =="
  CAMPUS_STACK_UPLOAD=0 bash scripts/wa/stack-up.sh
  exit 0
fi

cat <<MSG

============================================
 VISUAL REVIEW (manual start)
 Open: ${ROOM_URL}
 Or:   bash scripts/wa/stack-up.sh
 Stop: bash scripts/wa/stack-down.sh
============================================
MSG
