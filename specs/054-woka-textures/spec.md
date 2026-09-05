# Spec 054 — Distinct WOKA textures per agent

## Objetivo

Cada agente del bridge entra a WA con un `characterTextureIds` distinto
(catálogo local maleN/femaleN), no todos con `male1`.

## Criterios

- `texturesForAgent`: `appearance.skinKey` si es WOKA id; si no, hash estable.
- Seed demo asigna skinKeys WA distintos a la flota.
- Log de join incluye `textures=…`.
