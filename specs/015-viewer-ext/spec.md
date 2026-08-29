# 015 — Viewer extendido (capa 15)

**Rama**: `cursor/spec-015-viewer-ext-7599` (sobre `main`) · **Estado**: en implementación

## Objetivo
Extender el cliente de presentación para **proyectar las entidades del dominio ya existentes**
que el viewer aún no mostraba: workers, tasks (con estado), hosts/runtimes (plano de ejecución
+ *liveness* del agente), rango del agente, jefe de sala, fase SDD del edificio y biblioteca.

## Alcance
- `apps/viewer`: nuevos paneles Workers, Tasks, Execution (hosts/runtimes) y SDD & Library;
  agentes con rango + indicador de *live* (host+runtime), sala con jefe (★), fase Spec Kit por
  edificio. Sólo **proyección** (Constitución II/III), sin lógica de negocio.
- `apps/server`: seed enriquecido (roles, supervisor, jefe de sala, worker, task en review,
  host+runtime, Spec Kit, classification+doc) para demostrar las entidades.

## Fuera de alcance
Nuevos comandos/UI de escritura para cada entidad (se puede añadir después) · art/estética final.

## Criterios (verificación manual — UI)
- El viewer conecta y muestra: agentes con rango y *live*, jefe de sala, fase SDD.
- Paneles Workers / Tasks (con badge de estado) / Execution / SDD & Library poblados por el seed.
- `typecheck` (engine+server+viewer) y `build` en verde.
