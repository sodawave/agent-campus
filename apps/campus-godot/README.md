# campus-godot — **DEPRECATED**

> **Do not invest here.** Spatial presentation is **WorkAdventure** + [`apps/wa-bridge`](../wa-bridge).  
> Godot duplicated the same graphical/spatial goal. See [`docs/WORKADVENTURE.md`](../../docs/WORKADVENTURE.md).  
> This tree may be removed in a later cleanup; no new map/pathing/skin features.

---

Legacy notes (projection-only client; kept for archaeology):

A **projection-only** client (presentation plane). It connected to the core over **WebSocket**,
folded `CampusEvent` JSON with a GDScript reducer, and rendered `campus → buildings → rooms → agents`.

- Engine: **Godot 4.3** (GDScript, `gl_compatibility`).
- Read-only; Commands were planned for a later layer.

## Run (legacy)

```bash
npm run dev:server
CAMPUS_URL=ws://127.0.0.1:8787 bash apps/campus-godot/run.sh
```

## Headless screenshot (CI / walkthrough)

```bash
SHOT_PATH=/tmp/campus.png DISPLAY=:1 \
  CAMPUS_URL=ws://127.0.0.1:8787 \
  bash apps/campus-godot/run.sh --resolution 900x560
```

Once a campus is projected, the client saves the PNG and quits.

## Files

- `project.godot` — project config (main scene, renderer).
- `main.tscn` / `main.gd` — the projection scene (WS poll + render).
- `campus_client.gd` — WebSocket client + tolerant reducer over `CampusEvent`.
