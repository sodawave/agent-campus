# 009 — Org: comunicación, debate y evaluación (capa 9)

**Rama**: `cursor/spec-009-org-7599` (sobre 008) · **Estado**: en implementación

## Objetivo
Formalizar las reglas de organigrama sobre la jerarquía (capa 6): comunicación sin saltar
jerarquía, **debate sólo entre mismo rango**, evaluación por el supervisor directo. Helpers
puros reutilizables + sesiones de debate en el estado.

## Alcance
- `domain/org.ts` (puro): `isDirectLine`, `arePeers`, `canCommunicate`, `canDebate`,
  `canEvaluate`.
- `DebateSession { id, participantIds, topic, status }`; `State.debates[]`.
- Comandos `debate.open` (≥2 participantes existentes, todos mismo rango) / `debate.close`.
  Eventos `debate.opened` / `debate.closed`. Fachada `debate.open/close`; builder `buildDebate`.

## Fuera de alcance
Mensajería de chat · ProjectCall · memory · speckit · host/runtime.

## Criterios (test-gate)
- Helpers: comunicación sólo en línea directa o entre pares; debate sólo mismo rango;
  evaluación sólo supervisor directo.
- `debate.open` entre mismo rango abre sesión; cruzar rangos → `not_same_rank`.
- Rechazos: `need_two_participants`, `participant_not_found`, `duplicate_id`.
- `debate.close` cierra; `debate_not_found` / `already_closed`.
- typecheck (engine+apps) + tests + build en verde.
