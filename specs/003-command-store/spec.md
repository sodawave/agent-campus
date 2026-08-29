# 003 — Command + CampusStore (capa 3)

**Rama**: `cursor/spec-003-command-store-7599` (sobre 002) · **Estado**: en implementación

## Objetivo
Introducir la frontera **Command vs Event** (Constitución IV) y la **fachada por entidad**
(Constitución V) sobre el dominio+reducer de 001/002. Un comando se **valida** y puede
**rechazarse**; sólo los eventos aceptados mutan la proyección. Sigue siendo plano de Control
puro (sin red, sin servicio remoto, sin clientes).

## Alcance
- `CampusCommand` (union JSON): `campus.load`, `building.spawn`, `room.spawn`, `agent.instantiate`.
- `execute(state, command): CommandResult` puro → `{ok:true,event}` | `{ok:false,reason}`.
- `RejectionReason`: `campus_already_loaded | campus_not_loaded | campus_mismatch |
  building_not_found | room_not_found_in_building | duplicate_id`.
- `CampusStore`: fachada `campus/building/room/agent`, con `state()`, `log()` (eventos
  aceptados en orden) y `subscribe()`. Orquesta `execute → reduce → append → notify`.

## Fuera de alcance (capas siguientes)
Eventos de rechazo en el log · transporte (in-memory/WS) + servicio remoto · workers · tasks ·
org · memory · Spec Kit por edificio · host/runtime · clientes.

## Criterios (test-gate)
- Cada comando válido produce su evento y muta el estado esperado.
- Cada `RejectionReason` tiene prueba: `{ok:false,reason}` sin mutar ni loguear.
- `log()` refleja en orden los eventos aceptados; recarga del mismo campus = no-op (sin log/notify extra).
- `subscribe` notifica en aceptación y no en rechazo; `unsubscribe` funciona.
- `npm run typecheck && npm test && npm run build` en verde.
