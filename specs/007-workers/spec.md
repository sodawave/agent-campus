# 007 — Workers anónimos (capa 7)

**Rama**: `cursor/spec-007-workers-7599` (sobre 006) · **Estado**: en implementación

## Objetivo
Modelar los **workers anónimos** (Constitución VI): sólo un agente de rango `ic` puede
instanciarlos/destruirlos; en el mapa se representan entrando/saliendo del campus. El **bucle
acotado** del worker (itera hasta el 100% y sale) es comportamiento del **plano de ejecución**
(host/runtime); aquí se modela el **ciclo de vida y el gate** en el core.

## Alcance
- `AgentInstance.kind` += `"anonymous_worker"`; campo `spawnedById?`. Constante
  `WORKER_SPAWNER_RANK_KEY = "ic"`. `State.workers: AgentInstance[]`.
- Comandos: `worker.spawn` (actor `ic`, building/room válidos, id único) y `worker.despawn`
  (sólo el spawner). Eventos: `worker.entered`, `worker.exited`.
- Builder `buildWorker`; fachada `worker.spawn` / `worker.despawn`.

## Fuera de alcance
Bucle acotado real y ejecución (plano host/runtime) · tasks/test-gate · org.

## Criterios (test-gate)
- Un `ic` instancia un worker (`worker.entered`) → aparece en `state.workers`.
- Un no-`ic` es rechazado (`rank_not_allowed`).
- Rechazos: `actor_not_found`, `building_not_found`, `room_not_found_in_building`, `duplicate_id`.
- Sólo el spawner destruye (`worker.exited`); si no, `not_worker_spawner`; worker inexistente → `worker_not_found`.
- typecheck (engine+apps) + tests + build en verde.
