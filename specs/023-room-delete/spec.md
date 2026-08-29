# 023 — room.delete + guard Leader no borrable (capa 23)

**Rama**: `cursor/spec-023-room-delete-7599` (sobre `main`) · **TDD**

## Objetivo
Permitir borrar rooms, cerrando el invariante pendiente: **la Leader office no se borra**, y no
se borra una room con agentes dentro.

## Alcance
- Comando `room.delete` (+ evento `room.deleted`; fachada `room.delete`).
- Guards: `room_not_found`; `leader_room_not_deletable` (si `isLeaderRoom`); `room_not_empty`
  (si algún agente tiene `roomId` = la room).

## Criterios (test-gate, TDD)
- Borra una room vacía no-leader.
- Rechaza borrar la Leader office (`leader_room_not_deletable`).
- Rechaza borrar una room con agentes (`room_not_empty`).
- Room inexistente → `room_not_found`.
- typecheck (5) + tests (engine 126 + api 6) + build en verde.
