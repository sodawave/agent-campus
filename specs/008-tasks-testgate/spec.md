# 008 — Tasks & test-gate (capa 8)

**Rama**: `cursor/spec-008-tasks-testgate-7599` (sobre 007) · **Estado**: en implementación

## Objetivo
Modelar el **test-gate** de tareas (Constitución VI): una tarea sólo está *hecha* si pasa su
verificación. Ciclo `queued → running → under_review → succeeded | needs_revision`, evaluada
por el **supervisor directo** del asignado. `needs_revision` reabre el bucle (se puede reiniciar).

## Alcance
- `Task { id, title, assigneeId, orderedById?, status, evaluatorId?, verdict? }`; `TaskStatus`,
  `TaskVerdict`; `State.tasks[]`.
- Comandos: `task.assign`, `task.start`, `task.submit`, `task.evaluate`. Eventos:
  `task.created`, `task.started`, `task.submitted`, `task.evaluated`.
- Fachada `task.assign/start/submit/evaluate`; builder `buildTask`.
- Transiciones validadas en `execute`; `reduce` aplica estado (tolerante).

## Fuera de alcance
Ejecución real del trabajo (plano host/runtime) · org completo (debate) · runs/telemetría.

## Criterios (test-gate)
- Camino feliz llega a `succeeded` sólo vía evaluación del **supervisor directo**.
- `needs_revision` deja la tarea reiniciable (loop).
- Sólo el supervisor evalúa (`not_supervisor`); evaluador inexistente (`evaluator_not_found`).
- Transiciones inválidas → `invalid_transition`; `assignee_not_found`, `task_not_found`, `duplicate_id`.
- typecheck (engine+apps) + tests + build en verde.
