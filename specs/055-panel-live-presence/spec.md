# Spec 055 — Panel live presence

## Objetivo

El control panel muestra presencia en vivo: agentes del core (GraphQL) +
posición/zona/social desde wa-bridge `GET /presence`.

## Criterios

- wa-bridge sirve `/presence` en `:8790` (CORS abierto; `WA_PRESENCE_PORT=0` desactiva).
- GraphQL `Agent` incluye kind/buildingId/roomId/skinKey.
- Panel: sección Live presence con poll 2s.
