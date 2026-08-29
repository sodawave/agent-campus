#!/usr/bin/env bash
# Run the Agent Campus Godot client. Uses an existing `godot` on PATH, or
# `$GODOT_BIN`, otherwise downloads Godot 4.3 (standard, GDScript) into a cache.
#
# Env:
#   CAMPUS_URL   core WebSocket URL (default ws://127.0.0.1:8787)
#   SHOT_PATH    if set, save a PNG screenshot once the campus is projected, then quit
#   GODOT_BIN    explicit Godot binary path
# Extra args are passed to Godot (e.g. --resolution 900x560).
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
GODOT_VERSION="${GODOT_VERSION:-4.3-stable}"

if [ -z "${GODOT_BIN:-}" ]; then
  if command -v godot >/dev/null 2>&1; then
    GODOT_BIN="$(command -v godot)"
  else
    CACHE="${GODOT_CACHE:-$HOME/.cache/agent-campus-godot}"
    mkdir -p "$CACHE"
    base="Godot_v${GODOT_VERSION}_linux.x86_64"
    GODOT_BIN="$CACHE/$base"
    if [ ! -x "$GODOT_BIN" ]; then
      echo "Downloading Godot ${GODOT_VERSION}..."
      curl -sSL -o "$CACHE/godot.zip" \
        "https://github.com/godotengine/godot/releases/download/${GODOT_VERSION}/${base}.zip"
      unzip -o -q "$CACHE/godot.zip" -d "$CACHE"
      chmod +x "$GODOT_BIN"
    fi
  fi
fi

exec "$GODOT_BIN" --path "$HERE" "$@"
