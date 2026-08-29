# 029 — CampusConfig: language + timezone (capa 29)

**Rama**: `cursor/spec-029-campus-config-7599` (sobre `main`) · **TDD**

## Objetivo
Primer ladrillo del **Control Panel**: config de dominio del campus (idioma, zona horaria),
en el estado, gobernada por el core. Base para colgar luego proveedores/modelos y toggles.

## Alcance
- `CampusConfig { language, timezone }` + `DEFAULT_CONFIG` (`en`/`UTC`); `State.config`.
- Comando `campus.setConfig { language?, timezone? }` (patch) → evento `campus.config.updated`;
  requiere campus cargado (`campus_not_loaded`). Fachada `campus.setConfig`.

## Fuera de alcance (siguiente)
- Proveedores/modelos de IA + credenciales (secretos) y toggles (auto-assign leader) → cuelgan aquí después.
- GraphQL para leer/escribir config; Control Panel UI.
- Token de conexión (auth) — secreto del servidor, fuera del estado.

## Criterios (test-gate, TDD)
- Default `en`/`UTC`; `setConfig` parchea idioma/zona de forma independiente.
- `setConfig` sin campus → `campus_not_loaded`.
- typecheck (5) + tests (engine 135 + api 11) + build en verde.
