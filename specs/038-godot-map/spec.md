# 038 — Cliente Godot: layout de mapa top‑down (capa 38)

**Rama**: `cursor/spec-038-godot-map-7599` (apilada sobre `cursor/spec-037-campus-godot-7599`)

## Objetivo
Evolucionar el cliente Godot de una **lista** a un **mapa top‑down** fiel a la
referencia estética (interior tipo oficina, pixel/Gather.town): edificio como
panel, rooms como **tiles** con suelo/paredes y cabecera, y agentes como
**sprites** colocados dentro de su room. Sigue siendo solo lectura.

## Referencias estéticas
- `assets/refs/aesthetic-campus-isometric-clay.png` — vista macro (largo plazo).
- `assets/refs/building-departments-schematic-isometric.png` — rooms como bloques.
- `assets/01a049df-…jpg` — **top‑down office** (la vista accionable ahora).

## Alcance
- `main.gd` (ahora `Node2D`, dibujo por `_draw`): fondo oscuro, título del campus,
  por cada building un panel con su nombre e icono; rooms en flujo con wrap, cada
  una con suelo/cabecera/pared y etiqueta `key · role`; agentes como sprites
  (círculo + ojos) en rejilla dentro de la room, con nombre y `rank/skill`.
  - **Leader** (rankKey `leader`) en dorado; **jefe de departamento**
    (`room.headAgentId`) con aro azul.
- `campus_client.gd`: el reductor ahora también pliega `room.head.assigned`
  (guarda `headAgentId` en la room) para pintar al jefe.
- Sin tileset/arte externo (dibujo vectorial), funciona en render por software.

## Fuera de alcance (capas siguientes)
- Tileset/sprites reales, layout espacial rico (pasillos, mobiliario), isométrico.
- Interacción → Commands; workers/tasks/hosts en el mapa.

## Criterios (test-gate)
- Con el core sembrado, el mapa renderiza buildings → rooms (con `role`) → agentes,
  destacando leader (dorado) y jefe de depto (aro azul). Evidencia: PNG headless.
