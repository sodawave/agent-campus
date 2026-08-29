# 004 — Transporte: servidor/cliente del core (capa 4)

**Rama**: `cursor/spec-004-transport-7599` (sobre 003) · **Estado**: en implementación

## Objetivo
Exponer el core (Command/Event + CampusStore) a través de una **frontera de transporte**
agnóstica, probando la convergencia de clientes y el catch-up de los que entran tarde. Primera
implementación **in-memory** (determinista, testeable sin red). El adaptador WebSocket es la
capa 5.

## Alcance
- `net/protocol.ts`: mensajes JSON `ClientMessage` (`command`) y `ServerMessage`
  (`snapshot` | `event` | `result`).
- `net/connection.ts`: interfaz `Connection` (string in/out) + `createInMemoryPair()`.
- `net/CampusServer.ts`: envuelve `CampusStore`; en conexión envía `snapshot` (log completo);
  valida comandos vía `store.dispatch`; devuelve `result` al emisor y **difunde** el evento
  aceptado a todas las conexiones.
- `net/CampusClient.ts`: proyección de solo lectura vía `reduce`; `state()`, `subscribe()`,
  `send(command): Promise<CommandResult>`.
- `CampusStore.dispatch(command)` pasa a ser público (comando genérico).

## Fuera de alcance (capas siguientes)
Adaptador WebSocket real + apps (headless server + cliente navegador) = capa 5 · eventos de
rechazo en el log · workers · tasks · org · memory · host/runtime · clientes ricos.

## Criterios (test-gate)
- Un cliente converge al mismo estado que el servidor tras comandos.
- Dos clientes convergen entre sí y con el servidor (difusión de eventos).
- Un rechazo se devuelve al emisor y **no** se aplica ni difunde.
- Un cliente que entra tarde se pone al día vía `snapshot`.
- `subscribe` del cliente refleja eventos remotos.
- `npm run typecheck && npm test && npm run build` en verde.
