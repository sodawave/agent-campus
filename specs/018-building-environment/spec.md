# 018 — Building = Entorno: contexto + Boss office + lead (capa 18)

**Rama**: `cursor/spec-018-building-environment-7599` (sobre `main`) · **Estado**: en implementación · **TDD** (tests primero)

## Objetivo
Reencuadrar el building como **Entorno** (Casa, Empresa A…) y garantizar su mínimo estructural:
al crear un building se crea **automáticamente** su **Boss office** (room `role:"boss"`, no
borrable) y un **agente boss** que queda como **lead** del entorno. Además, contexto del entorno
y reasignación de lead.

## Decisiones (confirmadas)
1. `building.spawn` crea la Boss office automáticamente (compuesto, en el core).
2. La Boss office spawnea un **agente tipo boss** (`rankKey:"boss"`), que es el `campusLeadAgentId`.
3. `Room.role` marca `"boss"`; la Boss room es **no borrable** (invariante; el guard se aplicará
   cuando exista `room.delete`).
- **Rango**: etiqueta libre en el agente (`agent.rankKey`); **no** hay catálogo de ranks en el
  Building (se eliminó del modelo; un escalafón formal futuro iría en Project/Campus).

## Alcance
- `Building += context?`, `campusLeadAgentId?`. `Room += role?`. Constantes `BOSS_RANK_KEY`,
  `BOSS_ROOM_ROLE`; helper `isBossRoom`.
- `building.spawn` **compuesto**: emite un único `building.spawned` enriquecido con `bossRoom`
  (role boss) + `bossAgent` (rankKey boss) y `building.campusLeadAgentId = bossAgent.id`.
  Campos opcionales en el evento → compatible con eventos crudos antiguos (replay tolerante).
- Comandos `building.updateContext` / `building.assignLead` (+ eventos `building.context.updated`
  / `building.lead.assigned`; reason `agent_not_in_building`). Fachada `building.updateContext/assignLead`.

## Fuera de alcance (capas siguientes)
- `Project` (entidad + inventario del building) y `assignment` (agente↔proyecto).
- `status` (active/archived), `memoryWingId` explícito, `room.delete` (+ guard boss), deep-dive de room.

## Criterios (test-gate, TDD)
- `building.spawn` crea building + Boss room (role boss) + boss agent; lead = boss; un solo
  evento `building.spawned`.
- `updateContext` fija el contexto; `building_not_found` si no existe.
- `assignLead` válido; rechazos `building_not_found` / `agent_not_found` / `agent_not_in_building`.
- `reduce` tolerante: evento crudo `building.spawned` solo con building; context/lead de building inexistente → sin cambios.
- typecheck (5 workspaces) + tests (engine 107 + api 6) + build en verde.
