# 032 — Config de proveedores/modelos de IA (capa 32)

**Rama**: `cursor/spec-032-ai-providers-7599` (sobre `main`) · **TDD**

## Objetivo
Añadir a la config del campus un **catálogo de proveedores/modelos de IA** y un **modelo por
defecto**, base para que el `harness` de cada agente elija de ahí. Las **credenciales/keys son
secretos** y NO viven en el estado.

## Alcance
- `AiProvider { id, name, models[] }`, `ModelRef { providerId, model }`; `CampusConfig` += `providers[]`,
  `defaultModel: ModelRef | null` (DEFAULT: `[]` / `null`).
- Comandos `campus.addProvider` (upsert), `campus.removeProvider`, `campus.setDefaultModel`
  (+ eventos). Reasons: `provider_not_found`, `model_not_in_provider`.
- Fachada `campus.addProvider/removeProvider/setDefaultModel`.
- `removeProvider` limpia `defaultModel` si apuntaba a ese proveedor.

## Fuera de alcance (siguiente)
- Exponer en GraphQL + editar en Control Panel (capa 33). Credenciales (secretos) + token (auth).
- `harness` por agente que selecciona del catálogo (capa 34).

## Criterios (test-gate, TDD)
- addProvider upsert con modelos; setDefaultModel válido; rechazos `provider_not_found`/`model_not_in_provider`.
- removeProvider limpia defaultModel; requiere campus cargado.
- typecheck (5) + tests (engine 140 + api 15) + build en verde.
