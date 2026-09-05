#!/usr/bin/env bash
# Wipe and recreate the local WorkAdventure Docker stack (submodule read-only).
# Does not touch campus engine processes (use scripts/wa/stack-down.sh for those).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WA="$ROOT/workadventure"
SCALE_OIDC="${WA_SCALE_OIDC:-1}"

cd "$WA"

if [[ ! -f .env ]]; then
  echo "== creating .env from .env.template (required SECRET_KEY) =="
  cp .env.template .env
fi

echo "== docker compose down (remove orphans) =="
docker compose -f docker-compose.yaml -f docker-compose-no-oidc.yaml down --remove-orphans || true
docker ps -aq --filter name=workadventure | while read -r id; do
  docker rm -f "$id" 2>/dev/null || true
done

echo "== docker compose up =="
docker compose -f docker-compose.yaml -f docker-compose-no-oidc.yaml up -d

if [[ "$SCALE_OIDC" == "1" ]]; then
  # Upstream no-oidc sets oidc replicas=0, but play still has OPENID_* → Login 500.
  # Scale the local mock so Login works without a real IdP.
  echo "== scale oidc-server-mock=1 (local mock for Login button) =="
  docker compose -f docker-compose.yaml -f docker-compose-no-oidc.yaml \
    up -d --scale oidc-server-mock=1
fi

echo "== ensure protobuf messages generated (play wait-proto) =="
# Fresh clones ignore generated files; ts-proto may need @bufbuild/protobuf on Node 24.
docker compose -f docker-compose.yaml -f docker-compose-no-oidc.yaml up -d messages
for i in $(seq 1 60); do
  if docker exec workadventure-messages-1 test -d /usr/src/app/node_modules 2>/dev/null; then
    break
  fi
  sleep 2
done
if ! docker exec workadventure-messages-1 test -f /usr/src/libs/messages/src/ts-proto-generated/messages.ts 2>/dev/null \
  && ! [[ -f "$WA/libs/messages/src/ts-proto-generated/messages.ts" ]]; then
  docker exec workadventure-messages-1 sh -c \
    'cd /usr/src/app && npm install @bufbuild/protobuf --no-save && npm run proto-all' || true
fi

echo "== waiting for play =="
for i in $(seq 1 120); do
  code="$(curl -sS -o /dev/null -w "%{http_code}" --connect-timeout 2 "http://play.workadventure.localhost/" 2>/dev/null || echo 000)"
  if [[ "$code" == "200" ]]; then
    echo "play ready (attempt $i)"
    break
  fi
  if (( i % 15 == 0 )); then
    echo "… still waiting ($i) http=$code"
  fi
  sleep 5
done

echo
echo "WA map:  http://play.workadventure.localhost/~/campus/starter/map.wam"
echo "Re-upload map if needed: bash scripts/wa/upload-starter-to-map-storage.sh"
echo "Prefer anonymous entry; Login uses the local OIDC mock when SCALE_OIDC=1."
