# 006 — Agent roles & hierarchy (capa 6)

**Rama**: `cursor/spec-006-agent-roles-7599` (sobre 005) · **Estado**: en implementación

## Objetivo
Enriquecer el agente con **rol y jerarquía** (rank, oficio, supervisor) y permitir designar el
**jefe de sala** (`Room.headAgentId`). Aditivo y no rompe capas previas (campos opcionales).
Desbloquea workers (rango `ic`) y las reglas de org.

## Alcance
- `AgentInstance`: campos opcionales `rankKey?`, `skillKey?`, `supervisorId?`.
- `Room`: campo opcional `headAgentId?`.
- Comandos: `agent.assignSupervisor` (agent/supervisor existentes, no auto-supervisión) y
  `room.assignHead` (sala existente, agente existente y **perteneciente** a la sala).
- Eventos: `agent.supervisor.assigned`, `room.head.assigned`.
- Fachada: `agent.assignSupervisor`, `room.assignHead`; `agent.instantiate` acepta rol opcional.

## Fuera de alcance
Reglas de debate/evaluación (usan esta jerarquía) = capa org · workers · tasks · memory · etc.

## Criterios (test-gate)
- `buildAgent` omite campos de rol si no se dan (no rompe fixtures) y los incluye si se dan.
- `assignSupervisor` asigna/limpia; rechaza `agent_not_found`/`supervisor_not_found`/`self_supervision`.
- `assignHead` asigna; rechaza `room_not_found`/`agent_not_found`/`agent_not_in_room`.
- `reduce` de eventos de rol es tolerante (ignora objetivos inexistentes).
- typecheck (engine+apps) + tests + build en verde.
