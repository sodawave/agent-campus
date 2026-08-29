# Agent Campus — guía para agentes

Metodología operativa y reglas de arquitectura para trabajar en este repo.
Documento canónico de diseño: [`docs/TECH_SPEC.md`](docs/TECH_SPEC.md).

## Monorepo

npm workspaces:

- `packages/campus-engine` — **core** puro: dominio, reglas, `CampusStore`, `CampusCore`, contrato Command/Event (TypeScript, sin render).
- `apps/server` — **core headless** (sin pantalla): corre el core y lo sirve por WebSocket (`:8787`).
- `apps/viewer` — **pantalla mínima**: se conecta al core y proyecta el estado + envía Commands (`:5173`).

Comandos (desde la raíz):

```bash
npm install
npm run server      # core headless en ws://localhost:8787 (sin pantalla)
npm run viewer      # pantalla mínima en :5173 (consume el core)
npm run typecheck   # engine + server + viewer
npm test            # Vitest (engine + server)
npm run build       # viewer (vite build)
```

## Arquitectura — invariantes (no negociables)

Tres planos (ver TECH_SPEC §4). **Ningún plano contiene reglas de otro.**

1. **Control (core, servidor)** — única autoridad: identidad, org, binding a campus/edificio, reglas y **secuencia** del bus. Vive en `campus-engine` + API.
2. **Ejecución (host)** — el proceso vivo del agente (incluso headless por CLI) con acceso a ficheros locales. `domain/host.ts`.
3. **Presentación (cliente)** — Godot/web; **solo renderiza**. Cero lógica de negocio.

Reglas duras:

- **El runtime propone; el core dispone; los clientes proyectan.**
- Clientes = proyección de solo-lectura; aplican `reduce(state, event)` (idempotente). Cualquier interacción se envía como **Command** al core; nunca mutan estado local.
- **Command** (cliente/host → core, validable/rechazable) ≠ **Event** (`CampusEvent`, core → clientes, hecho secuenciado). El contrato `CampusEvent` es neutral de lenguaje (JSON serializable).
- El `CampusStore` es **campus-scoped** y expone una **fachada por entidad**: `store.campus.* / building.* / room.* / agent.* / worker.*` (y `building.specKit.*`). Añadir acción = 1 constructor puro en `domain/` + 1 método en su namespace + 1 case en el reducer.
- Campus **multi-edificio**: `campus → buildings[] (Project) → rooms (Workspace)`. Un agente es una sola instancia; para trabajar en otro edificio se **presta** vía `ProjectCall` (`agent.callToBuilding` / `returnHome`) — **nunca se clona**. El préstamo mueve la representación (`projectId`), no la ejecución (`hostId`).

## Premisas de desarrollo

Producto:

- **Task con test-gate:** hecho = 100% de lo ordenado **+ test verde** (`queued → running → under_review → succeeded`; evalúa el supervisor directo).
- **Worker = bucle acotado hasta el 100%** y luego **sale** (`worker.exited`); no es un proceso perpetuo. Alinea con `SpecKitConvergenceStatus` y `RunStatus`.
- **Subprocesos detallados:** cada orden se descompone en subprocesos verificables e independientes.

Ingeniería:

- **Cada unidad se testea** antes de cerrarla (Vitest en dominio/store; prueba manual en cliente).
- **Coherencia estructural:** un patrón por capa; dominio puro; fachada por entidad; reducer puro; clientes solo proyección.
- **Sin código espagueti:** reglas solo en el core; helpers puros reutilizables; imports `type`-only donde aplique.
- **Refactor periódico ("cada x"):** consolidar/limpiar de forma recurrente; extraer/renombrar cuando un patrón se repite.

## Protocolo de trabajo — una rama por spec (SDD / Spec Kit)

**1 spec = 1 rama = 1 PR.** Mapea a las fases de Spec Kit.

| Fase | Acción |
|---|---|
| `specify` | Abrir rama dedicada `cursor/spec-<slug>-<suffix>` |
| `plan` / `tasks` / `implement` | Trabajar **solo esa spec** en su rama |
| `converge` | Spec cerrada → `typecheck` + `test` + `build` verdes |
| merge | PR a `main` (Bugbot + CI) → merge. `main` = integración estable |

- No acumular specs distintas en una rama.
- Cada cambio lógico = un commit descriptivo.
- Antes de abrir PR: `npm run typecheck && npm test && npm run build` en verde.
- `main` siempre desplegable/estable.

Metodología SDD con **Spec Kit** (github/spec-kit, integración `cursor-agent`):

- Principios de gobierno: [`.specify/memory/constitution.md`](.specify/memory/constitution.md).
- Comandos del agente en `.cursor/skills/speckit-*`: `/speckit-specify`, `/speckit-clarify`, `/speckit-plan`, `/speckit-tasks`, `/speckit-implement`, `/speckit-converge` (+ `/speckit-analyze`, `/speckit-checklist`).
- Artefactos de feature en `specs/<NNN-slug>/` (spec.md, plan.md, tasks.md).

## Convenciones de código

- TypeScript estricto (ver `tsconfig.base.json`): `noUncheckedIndexedAccess`, `verbatimModuleSyntax`, etc.
- `domain/` no importa render ni store; el store no importa cliente.
- Eventos nuevos → añadir al union `CampusEvent` y su case en `reduce`.
- Tests junto al paquete (`packages/campus-engine/test`).
