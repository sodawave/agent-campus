# Spec 051 — wa-bridge joins per Building.waRoomUrl

## Objetivo

Cada agente entra al mapa WA de su building:

- `AgentRef.waRoomUrl` resuelto desde `Building.waRoomUrl` (fallback `WA_ROOM_URL` env).
- Si el URL cambia (p.ej. map provisioned), la sesión se cierra y se re-join.

## Criterios

- Tests: join usa URL del building; rejoin al cambiar URL.
- Fallback a config global si building sin `waRoomUrl`.
