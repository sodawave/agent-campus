# Tasks: Agents — AgentInstance + agent.instantiated (capa 2)

**Branch**: `cursor/spec-002-agents-7599` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

## Fase A — Dominio

- [ ] **T001** `types.ts`: añadir `AgentInstance` (mínimo), variante `agent.instantiated` al
  union `CampusEvent`, y `agents: AgentInstance[]` en `State` + `EMPTY_STATE`.
- [ ] **T002** `builders.ts`: `buildAgent` puro (IDs por caller, `kind` por defecto `"named"`).
- [ ] **T003** `reduce.ts`: case `agent.instantiated` (building+room existentes y coherentes,
  dedupe por id, sin mutación).

## Fase B — Tests (US1 + edge)

- [ ] **T004** `test/agents.test.ts`:
  - AS1: agente asociado a su sala/edificio.
  - AS2/AS3: idempotencia + determinismo (K agentes).
  - Tolerancia: `buildingId` inexistente, `roomId` inexistente, room de otro building,
    id duplicado → estado sin cambios.
  - Inmutabilidad de la entrada.
  **Gate**: verde.

## Fase C — Cierre

- [ ] **T005** `npm run typecheck && npm test && npm run build` en verde; evidencia al PR.
- [ ] **T006** Commits por cambio lógico, push, PR (base = rama 001). **Sin merge**.

## Trazabilidad

| Requisito | Tarea |
|---|---|
| FR-001/002/003 | T001 |
| FR-004 | T003, T004 |
| FR-005 | T002, T004 |
| FR-006 / SC-001..004 | T004, T005 |
