#!/usr/bin/env bash
# Agent Campus compose runner — adapted from block/buzz deploy/compose/run.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

COMPOSE_FILES=(-f compose.yml)
if [[ "${CAMPUS_COMPOSE_TLS:-false}" == "true" ]]; then
  COMPOSE_FILES+=(-f compose.caddy.yml)
fi

compose() {
  docker compose --env-file .env "${COMPOSE_FILES[@]}" "$@"
}

require_env() {
  if [[ ! -f .env ]]; then
    echo "Missing deploy/compose/.env — copy .env.example and replace CHANGE_ME." >&2
    exit 1
  fi
  if grep -Eq '^[[:space:]]*[A-Za-z_][A-Za-z0-9_]*=.*CHANGE_ME' .env; then
    echo "deploy/compose/.env still contains CHANGE_ME placeholders." >&2
    exit 1
  fi
}

case "${1:-help}" in
  start|up)
    require_env
    compose up -d --wait
    ;;
  stop|down)
    compose down
    ;;
  restart)
    require_env
    compose up -d --wait --force-recreate api
    ;;
  pull)
    require_env
    compose pull
    ;;
  logs)
    shift || true
    compose logs -f "${@:-api}"
    ;;
  status|ps)
    compose ps
    ;;
  config)
    require_env
    compose config
    ;;
  help|-h|--help)
    cat <<'MSG'
Usage: ./run.sh <command>

  start | stop | restart | pull | logs [svc] | status | config

  CAMPUS_COMPOSE_TLS=true   include compose.caddy.yml
MSG
    ;;
  *)
    echo "Unknown command: $1 — run ./run.sh help" >&2
    exit 1
    ;;
esac
