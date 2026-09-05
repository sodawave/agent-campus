# Spec 056 — Demo stack scripts

## Objetivo

Un comando para levantar/apagar el demo campus (core, GraphQL, wa-bridge,
panel) limpiando procesos y logs previos. WA Docker no se toca.

## Criterios

- `scripts/wa/stack-up.sh` / `stack-down.sh` (+ npm `stack:up` / `stack:down`).
- `demo-visual.sh` puede arrancar el stack tras upload.
- Docs en WORKADVENTURE.md.
