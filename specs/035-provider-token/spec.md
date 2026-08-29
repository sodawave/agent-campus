# 035 — Token de proveedor (secreto) (capa 35)

**Rama**: `cursor/spec-035-provider-token-7599` (sobre `main`) · **TDD**

## Objetivo
Cada proveedor de IA necesita su **token/API key**. Un token es un **secreto**: no
puede vivir en `CampusState` (se difunde a todos los clientes y queda en el log de
eventos). Se guarda en un **almacén de secretos del lado del servidor** (GraphQL);
el estado solo refleja `hasToken` (indicador de presencia). Las queries nunca
devuelven el valor del token (write-only).

## Alcance
- Engine:
  - `AiProvider.hasToken?: boolean` (solo indicador; NO el token).
  - Comando `campus.setProviderToken { providerId, hasToken }` (+ evento
    `campus.provider.tokenSet`). Valida `campus_not_loaded`, `provider_not_found`.
  - Reduce fija `provider.hasToken`. Fachada `campus.setProviderToken`.
- GraphQL (`apps/api`):
  - `Provider.hasToken: Boolean!` (desde el estado).
  - Mutation `setProviderToken(providerId, token): CommandResult` → guarda el token
    en el almacén de secretos del servidor (en memoria, keyed por providerId; se
    borra si el token es vacío) y emite `campus.setProviderToken { hasToken }`.
  - El valor del token **no** se expone por ninguna query.
- Control Panel: por proveedor muestra `🔑 set` / `no token`; formulario para
  guardar el token (input tipo password, write-only).

## Fuera de alcance (siguiente)
- Persistencia del almacén de secretos (fichero/vault) y consumo del token por los
  runtimes/hosts al invocar el LLM. Autenticación del Control Panel.

## Criterios (test-gate, TDD)
- `setProviderToken` fija `hasToken=true` con token no vacío y `false` con vacío;
  rechaza proveedor inexistente.
- GraphQL: `setProviderToken` → `provider.hasToken` refleja el estado; el token no
  aparece en el estado ni en las queries.
- typecheck + tests (engine + api) + build en verde.
