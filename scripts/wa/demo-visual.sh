#!/usr/bin/env bash
# Visual demo helpers: upload map + print URLs. Start processes separately.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

echo "== upload starter map (shared campus/) =="
bash scripts/wa/upload-starter-to-map-storage.sh

ROOM_URL="${WA_ROOM_URL:-http://play.workadventure.localhost/~/campus/starter/map.wam}"
cat <<MSG

============================================
 VISUAL REVIEW
 Open in browser (anonymous OK):
   ${ROOM_URL}

 Then start (two terminals from repo root):
   cd engine && npm run start --workspace @agent-campus/server
   cd engine && WA_ROOM_URL='${ROOM_URL}' npm run start --workspace @agent-campus/wa-bridge

 Expect WOKAs: Mia, Ivan, Joy, Kevin, Luz (+ auto leaders).
============================================
MSG
