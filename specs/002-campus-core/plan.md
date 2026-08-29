# Implementation Plan: Campus Core (control-plane)

**Branch**: `cursor/spec-campus-core-7599` | **Date**: 2026-08-29 | **Spec**: [spec.md](./spec.md)

## Summary

Capa mínima del core: formalizar el contrato **`CampusCommand`** (petición) frente a **`CampusEvent`** (hecho), y un **`CampusCore`** in-process que envuelve `campus-engine`/`CampusStore`, valida cada Command con las reglas del dominio, **secuencia** los Events resultantes y expone snapshot + log para consumidores. In-memory. Subconjunto mínimo de Commands: `agent.spawn`, `worker.spawn`, `worker.despawn`.

## Technical Context

**Language/Version**: TypeScript 5.6 (strict). **Dependencies**: ninguna nueva. **Storage**: in-memory (event log + snapshot). **Testing**: Vitest. **Project Type**: monorepo (engine). **Constraints**: reducer puro/idempotente; contrato JSON-serializable; `domain/` sin imports de render.

## Constitution Check

- I Core autoritativo · II Tres planos · III runtime propone/core dispone · IV Command vs Event (este contrato lo formaliza) · V fachada por entidad (reutilizada) · VI test-gate · VII coherencia · **VIII loop mínimo testeado** (esta capa es el incremento mínimo; red/durabilidad/comandos restantes = capas posteriores). ✅ Sin violaciones.

## Project Structure

```text
packages/campus-engine/src/
├── domain/types.ts     # + CampusCommand union (subconjunto mínimo)
├── core/CampusCore.ts  # nuevo: execute(command) → CommandResult; state(); eventLog(); subscribe(); load()
└── index.ts            # export core
packages/campus-engine/test/
└── core.test.ts        # nuevo
```

**Structure Decision**: nuevo módulo `core/` que compone el `CampusStore` existente (no reescribe dominio). El core es el límite autoritativo; el store sigue siendo la proyección + fachada.

## Phase 0 — research

Sin incógnitas: `CampusEvent`, `reduce`, fachada y reglas ya existen. Solo se añade el envoltorio de Command + captura/secuencia de eventos.

## Phase 1 — design

- `CampusCommand` = `agent.spawn | worker.spawn | worker.despawn` (plain data, JSON-serializable).
- `CommandResult` = `{ ok:true; events } | { ok:false; reason }`.
- `CampusCore.execute` captura los `CampusEvent` emitidos durante la ejecución (suscripción temporal) y los devuelve secuenciados; en rechazo, no cambia estado.

## Phase 2 — tasks

Ver [tasks.md](./tasks.md).
