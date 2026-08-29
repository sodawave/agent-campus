# 039 — Cliente Godot: liveness + workers (capa 39)

**Rama**: `cursor/spec-039-godot-liveness-7599` (apilada sobre `cursor/spec-038-godot-map-7599`)

## Objetivo
Enriquecer la **proyección** (no los gráficos): el mapa refleja el **plano de
ejecución** y los **workers anónimos**. Un agente "vivo" (con runtime corriendo)
muestra un punto verde de estado; los workers de una room se dibujan como una fila
compacta con su recuento. Sin arte nuevo — el "mollar" gráfico llega después.

Encaja con la semilla del core: Mia ya tiene runtime (`rt-1`) → aparece viva; hay
un worker en engineering → aparece su fila.

## Alcance
- `campus_client.gd`: el reductor ahora pliega también:
  - `worker.entered` / `worker.exited` → lista `workers` (id, name, room).
  - `runtime.started` / `runtime.stopped` / `host.left` → lista `runtimes`;
    helper `is_live(agentId)` = tiene runtime `running`.
- `main.gd`:
  - punto verde de **liveness** en el sprite del agente vivo.
  - fila de **workers** al pie de la room (círculos grises + "N worker(s)");
    la altura de la room la contempla.
  - barra de estado añade `· N workers`.

## Fuera de alcance (capas siguientes)
- Tileset/sprites reales, mobiliario, isométrico ("lo mollar" gráfico).
- Tasks/projects/assignments en el mapa; interacción → Commands.

## Criterios (test-gate)
- Contra el core sembrado, Mia aparece con punto verde (viva) y engineering muestra
  "1 worker(s)". Evidencia: PNG headless.
