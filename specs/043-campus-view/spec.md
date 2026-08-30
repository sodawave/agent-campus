# Spec 043 — Modo Campus: diorama isométrico clay

## Problema

El visor Godot proyecta el campus como un panel plano "pixel-art" (041). No se parece a la
referencia estética [`assets/refs/aesthetic-campus-isometric-clay.png`](../../assets/refs/aesthetic-campus-isometric-clay.png)
(maqueta de arcilla, isométrica 2:1). Además el pliegue 042 trajo skins + appearance que el
visor aún no proyecta.

## Objetivo

Un **modo Campus** isométrico 2D/2.5D (estilo *clay* / diorama, evocando la ref) que:
- Proyecta solo estado del core (read-only), vía `reduce`-tolerante existente de `campus_client.gd`.
- Dibuja edificios como **cajas isométricas** (3 caras; proyección 2:1, painter's algorithm).
- Colorea cada edificio desde su **skin palette** (`{wall, header, accent, floor}`) si `appearance.skinKey` existe; fallback clay neutro.
- Población: punto-persona clay por agente en la plaza del edificio; burbuja con el conteo de
  agentes; indicador de agente vivo.
- Decoración procedural determinista (hash de id): caminos de arena entre edificios + árboles.
- Capas de vista para futuro **modo Room** (stub). `Tab` alterna modo (`CAMPUS_MODE` env para arranque).

## No-goals

- Nada que no sea proyección: cero comandos desde el cliente, cero lógica de negocio en Godot.
- Sin meshes/3D real, sin texturas: polígonos procedure draw.
- Sin cambios al contrato 042 (solo seed más rico + paletas clay).

## Contrato tocado

- `apps/campus-godot/*.gd` (main.gd shell + iso.gd + campus_view.gd + room_view.gd).
- `apps/server/src/main.ts`: seed más rico (2 edificios + habitaciones + agentes) y paletas clay.
- Nunca `campus_client.gd` deja de ser tolerante: ignora eventos desconocidos.