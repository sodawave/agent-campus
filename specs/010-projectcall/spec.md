# 010 — ProjectCall: préstamo inter-edificio (capa 10)

**Rama**: `cursor/spec-010-projectcall-7599` (sobre 009) · **Estado**: en implementación

## Objetivo
Permitir **prestar** un agente a otro edificio sin duplicarlo: un `ProjectCall` mueve su
**representación** (building/room), no su ejecución (host). Al cerrar, el agente **vuelve a
su origen** (capturado al iniciar la llamada).

## Alcance
- `ProjectCall { id, agentId, toBuildingId, toRoomId, originBuildingId, originRoomId, status }`;
  `AgentInstance.activeCallId?`; `State.calls[]`.
- Comandos `project.call` (agente existe y libre, building/room destino válidos, id único) y
  `project.returnHome` (agente en llamada activa). Eventos `project.call.issued`,
  `project.call.closed`.
- Fachada `agent.callToBuilding` / `agent.returnHome`.

## Fuera de alcance
Contexto efectivo del edificio destino (razonamiento) · memory · speckit · host/runtime real.

## Criterios (test-gate)
- `callToBuilding` mueve al agente al edificio/sala llamante y registra la llamada (origen capturado).
- `returnHome` restaura el origen y cierra la llamada; `activeCallId` a null.
- Rechazos: `already_on_call`, `agent_not_found`, `building_not_found`,
  `room_not_found_in_building`, `duplicate_id`, `not_on_call`.
- typecheck (engine+apps) + tests + build en verde.
