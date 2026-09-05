# Spec 053 — Unique leader names in seed

## Objetivo

Los leaders auto-creados por `building.spawn` dejan de llamarse todos
"Leader" en la demo visual. Seed usa `leaderName` distinto por edificio.

## Criterios

- Seed: Alpha→Aria, Beta→Bruno, Gamma→Cora.
- Test de dominio: `leaderName` se aplica al agente auto-creado.
- Tras reiniciar server+bridge, WA muestra 8 nombres distintos.
