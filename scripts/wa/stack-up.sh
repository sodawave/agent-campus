#!/usr/bin/env bash
# Start local campus demo: core + graphql + wa-bridge (+ optional panel).
# Wipes prior campus processes first. Does NOT start/stop WA Docker.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ENGINE="$ROOT/engine"
LOG_DIR="${CAMPUS_STACK_LOG_DIR:-$ROOT/logs}"
PIDFILE="${CAMPUS_STACK_PIDFILE:-$LOG_DIR/campus-stack.pids}"
ROOM_URL="${WA_ROOM_URL:-http://play.workadventure.localhost/~/campus/starter/map.wam}"
WITH_PANEL="${CAMPUS_STACK_PANEL:-1}"
UPLOAD="${CAMPUS_STACK_UPLOAD:-0}"

mkdir -p "$LOG_DIR"
bash "$ROOT/scripts/wa/stack-down.sh"

if [[ "$UPLOAD" == "1" ]]; then
  bash "$ROOT/scripts/wa/upload-starter-to-map-storage.sh" || true
fi

cd "$ENGINE"

start_bg() {
  local name="$1"
  shift
  local log="$LOG_DIR/campus-$name.log"
  : >"$log"
  (
    cd "$ENGINE"
    exec "$@"
  ) >>"$log" 2>&1 &
  local pid=$!
  echo "$pid" >>"$PIDFILE"
  echo "started $name pid=$pid log=$log"
}

: >"$PIDFILE"

start_bg server npm run start --workspace @agent-campus/server

for _ in $(seq 1 40); do
  if lsof -iTCP:8787 -sTCP:LISTEN >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done
if ! lsof -iTCP:8787 -sTCP:LISTEN >/dev/null 2>&1; then
  echo "server failed to listen on :8787 — see $LOG_DIR/campus-server.log" >&2
  exit 1
fi

start_bg graphql npm run graphql --workspace @agent-campus/api

(
  cd "$ENGINE"
  export WA_ROOM_URL="$ROOM_URL"
  export WA_ROUTINES="${WA_ROUTINES:-1}"
  export WA_PRESENCE_PORT="${WA_PRESENCE_PORT:-8790}"
  exec npm run start --workspace @agent-campus/wa-bridge
) >>"$LOG_DIR/campus-wa-bridge.log" 2>&1 &
echo $! >>"$PIDFILE"
echo "started wa-bridge pid=$! log=$LOG_DIR/campus-wa-bridge.log"

if [[ "$WITH_PANEL" == "1" ]]; then
  start_bg panel npm run dev --workspace @agent-campus/control-panel
fi

sleep 2
for _ in $(seq 1 40); do
  if curl -sf "http://127.0.0.1:8790/presence" >/dev/null 2>&1; then
    break
  fi
  sleep 0.25
done

cat <<MSG

============================================
 CAMPUS DEMO STACK UP
 WA map:     ${ROOM_URL}
 Panel:      http://localhost:5174/
 GraphQL:    http://127.0.0.1:8788/graphql
 Presence:   http://127.0.0.1:8790/presence
 Core WS:    ws://127.0.0.1:8787
 Logs:       ${LOG_DIR}/campus-*.log
 Stop with:  bash scripts/wa/stack-down.sh
============================================
MSG
