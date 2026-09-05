#!/usr/bin/env bash
# Tear down local campus demo processes (server, graphql, wa-bridge, panel).
# Does NOT touch WorkAdventure Docker.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
PIDFILE="${CAMPUS_STACK_PIDFILE:-$ROOT/logs/campus-stack.pids}"
LOG_DIR="${CAMPUS_STACK_LOG_DIR:-$ROOT/logs}"

kill_port() {
  local port="$1"
  local pids
  pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "$pids" ]]; then
    echo "kill :$port → $pids"
    # shellcheck disable=SC2086
    kill -TERM $pids 2>/dev/null || true
    sleep 0.4
    pids="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
    if [[ -n "$pids" ]]; then
      # shellcheck disable=SC2086
      kill -KILL $pids 2>/dev/null || true
    fi
  fi
}

if [[ -f "$PIDFILE" ]]; then
  echo "Stopping pids from $PIDFILE"
  while read -r pid; do
    [[ -z "$pid" ]] && continue
    kill -TERM "$pid" 2>/dev/null || true
  done < "$PIDFILE"
  sleep 0.5
  while read -r pid; do
    [[ -z "$pid" ]] && continue
    kill -KILL "$pid" 2>/dev/null || true
  done < "$PIDFILE"
  rm -f "$PIDFILE"
fi

# Always free demo ports (orphans from prior sessions).
for port in 8787 8788 8790 5174; do
  kill_port "$port"
done

# Pattern kill leftover npm/tsx under engine apps (best-effort).
pkill -f "$ROOT/engine/apps/(server|wa-bridge|api|control-panel)/" 2>/dev/null || true
pkill -f "tsx src/graphql-main.ts" 2>/dev/null || true

# Wipe stack logs (keep .gitkeep).
mkdir -p "$LOG_DIR"
rm -f "$LOG_DIR"/campus-*.log "$LOG_DIR"/campus-stack.pids 2>/dev/null || true
touch "$LOG_DIR/.gitkeep"

echo "Campus demo stack down. (WA Docker untouched.)"
