# Agent Campus Constitution

Principios de gobierno del proyecto (SDD). Prevalecen sobre cualquier otra práctica.
Detalle de diseño: [`docs/TECH_SPEC.md`](../../docs/TECH_SPEC.md). Guía operativa: [`AGENTS.md`](../../AGENTS.md).

## Core Principles

### I. Core autoritativo (única fuente de verdad)
El **core** (plano de control, en servidor) es la única autoridad: identidad, org, binding a campus/edificio, reglas y **secuencia** del bus de eventos. Nada es canónico hasta que el core lo acepta y le asigna orden. Las reglas de negocio viven solo en `packages/campus-engine`.

### II. Tres planos, sin fugas
El sistema se separa en **Control** (core/servidor), **Ejecución** (host/CLI: proceso vivo con ficheros locales) y **Presentación** (cliente Godot/web). **Ningún plano contiene reglas de otro.** `domain/` no importa render ni store; el store no importa cliente.

### III. El runtime propone, el core dispone, los clientes proyectan
Los hosts/runtimes **producen** eventos de actividad y **piden** comandos gobernados; el core **valida, ordena y decide**; los clientes **solo renderizan**. Ninguna interacción de cliente muta estado local.

### IV. Contrato Command vs Event (neutral de lenguaje)
**Command** (cliente/host → core) es validable y rechazable. **Event** (`CampusEvent`, core → clientes) es hecho consumado y secuenciado, **JSON serializable** para que cualquier cliente (Godot/GDScript, web/TS, CLI) lo consuma sin compartir código. Los clientes aplican `reduce(state, event)` **idempotente** (proyección de solo-lectura).

### V. Fachada por entidad + agentes no se clonan
El `CampusStore` es **campus-scoped** y expone una **fachada por entidad** (`campus/building/room/agent/worker`, `building.specKit`). Añadir acción = constructor puro en `domain/` + método en su namespace + case en `reduce`. Campus **multi-edificio** (`campus → buildings[] → rooms`); un agente es una sola instancia y se **presta** a otro edificio vía `ProjectCall` (mueve `projectId`, no `hostId`) — **nunca se clona**.

### VI. Test-gate y worker acotado (NON-NEGOTIABLE)
Una **task** solo está hecha si **pasa su verificación**: hecho = 100% de lo ordenado **+ test verde** (`queued → running → under_review → succeeded`; evalúa el supervisor directo). Un **worker** ejecuta un **bucle acotado (no infinito)** hasta cumplir al 100% y luego **sale** (`worker.exited`); no es un proceso perpetuo. Cada unidad de dominio/store se acompaña de tests (Vitest).

### VII. Coherencia estructural, sin espagueti, refactor recurrente
Un patrón por capa; helpers puros reutilizables; imports `type`-only donde aplique. Se refactoriza de forma periódica ("cada x") para no acumular deuda; se extrae/renombra cuando un patrón se repite.

## Restricciones técnicas

- TypeScript estricto (`tsconfig.base.json`: `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, …).
- Todo `CampusEvent` nuevo se añade al union y tiene su case en `reduce` (puro, sin I/O, idempotente).
- Tests junto al paquete (`packages/campus-engine/test`). `domain/` sin dependencias de render.
- Stack cerrado v1: cliente **Godot 4** (mobile/desktop/web); core **TypeScript** (API). Ver TECH_SPEC §3.

## Flujo de desarrollo (SDD / Spec Kit)

Fases: `constitution → specify → clarify → plan → tasks → implement → converge`.
Comandos del agente en `.cursor/skills/speckit-*` (`/speckit-specify`, `/speckit-clarify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement`, `/speckit-converge`, `/speckit-analyze`, `/speckit-checklist`).

- **1 spec = 1 rama = 1 PR.** Rama `cursor/spec-<slug>-<suffix>`, abierta en `specify`, cerrada en `converge`.
- Gate de cierre (`converge`): `npm run typecheck && npm test && npm run build` en verde + demo.
- Review gate: Bugbot (`.cursor/BUGBOT.md`) + branch protection. `main` = integración estable.
- No mezclar specs en una rama; un commit por cambio lógico.

## Governance

Esta constitución **prevalece** sobre otras prácticas. Toda PR verifica su cumplimiento; la complejidad debe justificarse. Las enmiendas se documentan aquí (con bump de versión) y se reflejan, si aplica, en `AGENTS.md`, `.cursor/rules/` y `TECH_SPEC.md`. Las herramientas de Spec Kit (`.specify/`, `.cursor/skills/`) se actualizan por separado de los artefactos de features en `specs/`.

**Version**: 1.0.0 | **Ratified**: 2026-08-29 | **Last Amended**: 2026-08-29
