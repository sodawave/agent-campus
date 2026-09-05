#!/usr/bin/env bash
# Upload workadventure/maps/starter to map-storage for inline editor (/~/ rooms).
# Lives in the monorepo (not the WA submodule). Do not edit files under workadventure/.
# Dev: no OIDC required when MAP_EDITOR_ALLOW_ALL_USERS=true (docker-compose-no-oidc).
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
MAPS="$REPO/workadventure/maps"
OUT="$(mktemp -d)"
ZIP="$(mktemp -t wa-campus-XXXXXX).zip"
AUTH_USER="${MAP_STORAGE_AUTH_USER:-john.doe}"
AUTH_PASS="${MAP_STORAGE_AUTH_PASSWORD:-password}"
UPLOAD_URL="${MAP_STORAGE_UPLOAD_URL:-http://map-storage.workadventure.localhost/upload}"
DIRECTORY="${MAP_STORAGE_DIRECTORY:-campus}"

cleanup() { rm -rf "$OUT" "$ZIP"; }
trap cleanup EXIT

if [[ ! -f "$MAPS/starter/map.json" ]]; then
  echo "Missing $MAPS/starter/map.json — init submodule: git submodule update --init" >&2
  exit 1
fi

mkdir -p "$OUT/starter" "$OUT/assets"
cp "$MAPS/starter/map.json" "$OUT/starter/map.tmj"
[[ -f "$MAPS/starter/script.js" ]] && cp "$MAPS/starter/script.js" "$OUT/starter/script.js"
for f in tileset5_export.png tileset6_export.png tileset1.png tileset1-repositioning.png Special_Zones.png; do
  cp "$MAPS/assets/$f" "$OUT/assets/"
done

( cd "$OUT" && zip -qr "$ZIP" starter assets )
echo "Uploading to $UPLOAD_URL directory=$DIRECTORY ..."
curl -sS -F "file=@$ZIP" -F "directory=$DIRECTORY" \
  "$UPLOAD_URL" --basic -u "$AUTH_USER:$AUTH_PASS"
echo
echo "Room (inline editor): http://play.workadventure.localhost/~/${DIRECTORY}/starter/map.wam"
echo "Set WA_ROOM_URL to that URL for wa-bridge."
