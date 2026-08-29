# 033 — Providers/models en GraphQL + Control Panel (capa 33)

**Rama**: `cursor/spec-033-providers-surface-7599` (sobre `main`)

## Objetivo
Exponer el catálogo de proveedores/modelos (capa 32) por **GraphQL** y hacerlo editable en el
**Control Panel**.

## Alcance
- `apps/api/graphql.ts`: tipos `Provider`/`ModelRef`, `Config += providers, defaultModel`;
  mutations `addProvider(id,name,models)`, `removeProvider(providerId)`, `setDefaultModel(providerId,model)`.
- `apps/control-panel`: panel "AI providers & models" — lista de proveedores/modelos + modelo por
  defecto; formularios para añadir/actualizar proveedor y fijar el modelo por defecto.

## Fuera de alcance (siguiente)
- `harness` por agente (elige del catálogo) — capa 34. Credenciales (secretos) + token (auth).

## Criterios (test-gate + smoke)
- GraphQL: `addProvider` + `setDefaultModel` + query `config.providers/defaultModel` (TDD).
- Smoke HTTP: `addProvider` y query funcionan contra el core vivo.
- typecheck (5) + tests (engine 140 + api 16) + build en verde.
