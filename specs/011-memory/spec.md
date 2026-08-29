# 011 — Memory (MemPalace) (capa 11)

**Rama**: `cursor/spec-011-memory-7599` (sobre `main`) · **Estado**: en implementación

## Objetivo
Modelar la **memoria** de agente y de proyecto (edificio) como registros/punteros en el core
(no blobs), con **recall efectivo**: un agente recuerda lo suyo + la memoria de proyecto del
edificio en el que está (sigue al agente si se le presta a otro edificio).

## Alcance
- `MemoryRecord { id, scope: "agent"|"project", ownerId, room, text }`; `State.memories[]`.
- Comando `memory.remember` (owner válido: agente si scope agent, edificio si scope project;
  id único). Evento `memory.remembered`.
- Helper puro `recallForAgent(state, agentId)` = registros propios + memoria de proyecto del
  edificio actual. Fachada `memory.remember` + `memory.recall(agentId)` (lectura).

## Fuera de alcance
Vectorización/RAG real · biblioteca (library) · integración runtime MemPalace.

## Criterios (test-gate)
- Guarda registros agente y proyecto; `room` por defecto `_general`.
- `recall` = memoria propia + memoria de proyecto del edificio actual (no de otros).
- Recall **sigue** al agente tras un `ProjectCall`.
- Rechazos: `duplicate_id`, `agent_not_found` (scope agent), `building_not_found` (scope project).
- typecheck (engine+apps) + tests + build en verde.
