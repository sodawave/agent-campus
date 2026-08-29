# Feature Specification: Representer client (visual)

**Feature Branch**: `cursor/reset-to-core-7599`

**Created**: 2026-08-29

**Status**: Converged

**Input**: "Un cliente representador: consume el core headless por WS y representa visualmente el campus (vistas Campus / Edificio / Sala)."

**Seed docs**: `.specify/memory/constitution.md` (III clientes proyectan, IV Command/Event, VIII loop); `docs/TECH_SPEC.md` §9.1 (mapa: campus / edificio / sala).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Vista Edificio: representa departamentos y agentes (P1)

El cliente se conecta al core y **representa un edificio**: sus departamentos (salas) con los agentes colocados dentro (rango, "vivo" si tiene runtime, worker). Se actualiza en vivo con los eventos del core.

**Independent Test**: abrir el cliente; el edificio activo se dibuja con sus salas y agentes; al enviar un Command (spawn worker / add building), la representación se actualiza.

### User Story 2 - Vista Campus: edificios/proyectos activos (P1)

Una vista **Campus** muestra los edificios activos (tarjetas con contadores) y permite **entrar** a un edificio (→ vista Edificio). Breadcrumb Campus / Edificio.

**Acceptance Scenarios**:

1. **Given** el cliente conectado, **When** está en vista Campus, **Then** ve los edificios con nº de agentes/vivos; al pulsar uno entra a su vista Edificio.
2. **Given** vista Edificio, **When** vuelve por el breadcrumb, **Then** regresa a Campus.

### Edge Cases

- Sin conexión → indicador y no rompe.
- Command inválido → sin cambio en la representación.

## Requirements *(mandatory)*

- **FR-001**: El cliente MUST conectarse al core por WS, proyectar por `reduce` y **renderizar** sin lógica de negocio.
- **FR-002**: Vista **Edificio**: dibuja salas (departamentos) y los agentes en ellas (rango, vivo, worker), en vivo.
- **FR-003**: Vista **Campus**: edificios activos con contadores; navegación a Edificio y vuelta (breadcrumb).
- **FR-004**: Interacciones envían **Commands** al core; la representación refleja los eventos.
- **FR-005**: Todo cruza como JSON; el cliente no muta estado local.

## Success Criteria *(mandatory)*

- **SC-001**: La vista Edificio representa salas+agentes del estado del core y se actualiza al llegar eventos.
- **SC-002**: La vista Campus lista los edificios y permite entrar/volver.
- **SC-003**: Un Command desde el cliente se refleja en la representación.
- **SC-004**: `typecheck`/`build` verdes; demo visual sin errores de consola.

## Assumptions

- Reutiliza el core headless (`apps/server`) y el core (`campus-engine`); evoluciona `apps/viewer` (no se crea otra app).
- Geometría del edificio: layout de referencia del engine (`sampleDataset.building`).
- **Mínimo (VIII)**: esta capa = vistas Campus + Edificio (canvas). La vista **Sala** (zoom a una sala) y el pulido Stardew son **capas posteriores**.

## Clarifications

Sin `[NEEDS CLARIFICATION]`: alcance = incremento mínimo (Campus + Edificio) por Principio VIII; Sala en la siguiente capa.
