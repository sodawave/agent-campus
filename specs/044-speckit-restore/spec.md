# Spec 044 — Restaurar Spec Kit (Cursor + índice)

## Problema

El working tree había borrado `.cursor/skills/speckit-*` y el manifesto `cursor-agent`.
La integración quedó solo en opencode. Sin skills Cursor no se puede operar el flujo
Spec Kit en este IDE. Además no hay un índice claro de specs vivas vs superseded
tras el giro a WorkAdventure.

## Objetivo

1. **Skills Cursor** presentes y usables (`.cursor/skills/speckit-*/SKILL.md`).
2. **Integración dual**: Cursor + opencode documentada y reflejada en `.specify/`.
3. **Índice de specs** (`specs/INDEX.md`) con 044–047 planificadas y 041–043 marcadas superseded.
4. AGENTS.md apunta al índice y al flujo Spec Kit vigente.

## No-goals

- No encapsular `engine/` ni submodule WA (045–046).
- No aplanar dominio building/room (047+).
- No actualizar templates upstream salvo que sea necesario para que las skills funcionen.

## Criterios de aceptación

- Existen las 10 skills `speckit-*` bajo `.cursor/skills/`.
- `.specify/integrations/cursor-agent.manifest.json` restaurado.
- `specs/INDEX.md` lista backlog 044–047 y superseded 041–043.
- Specs 041–043 tienen nota **Superseded** al inicio.
- `AGENTS.md` referencia el índice y mantene Cursor + opencode.
