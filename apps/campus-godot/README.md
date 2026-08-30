# campus-godot — Godot presentation client

A **projection-only** client (presentation plane, Constitución/TECH_SPEC §4). It
connects to the authoritative core over **WebSocket**, folds the language-neutral
`CampusEvent` JSON contract with a small GDScript reducer (sharing no code with the
TS engine), and renders `campus → buildings → rooms → agents`.

- Engine: **Godot 4.3** (GDScript, `gl_compatibility` renderer so it also runs on
  software GPUs / headless CI).
- Read-only for now; user input as **Commands** to the core comes in a later layer.

## Run

```bash
# Start the core first (from repo root):
npm run dev:server            # ws://0.0.0.0:8787

# Then the client (downloads Godot 4.3 the first time):
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
