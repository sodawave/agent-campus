# 030 — GraphQL: 2ª superficie de conexión (capa 30)

**Rama**: `cursor/spec-030-graphql-7599` (sobre `main`) · **TDD**

## Objetivo
Exponer el core por **GraphQL** (queries/mutations) como base del **Control Panel**. Conecta al
core por WS (mismo contrato Command/Event); la capa de resolvers es testeable in-memory.

## Alcance (`apps/api`)
- `graphql.ts`: schema (SDL) + resolvers sobre `CampusLink`; `executeGraphql(link, query, vars)`.
  - Query `campus { id name config{language timezone} buildings agents projects }`.
  - Mutations `setConfig(language, timezone)`, `spawnBuilding(id, name)`, `createProject(id, buildingId, name)` → `CommandResult { ok, reason, event }`.
- `graphql-main.ts`: servidor HTTP (`POST /graphql`, `$GRAPHQL_PORT` def 8788) conectado al core.
- Script `npm run graphql -w @agent-campus/api`.

## Fuera de alcance (siguiente)
- Control Panel UI; auth/token; proveedores/modelos (cuelgan de la config); suscripciones/live.

## Criterios (test-gate + smoke)
- Query campus (name/config/buildings) e integración de mutations (`setConfig`, `createProject`,
  rechazo `building_not_found`) vía `executeGraphql` (TDD).
- Smoke: servidor HTTP conecta al core y responde queries.
- typecheck (5) + tests (engine 135 + api 15) + build en verde.
