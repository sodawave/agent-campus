# WorkAdventure agent bridge

Instantiates **named** agents from the campus core (`apps/server`) into a WorkAdventure room using the same join path as a human (anonymous JWT → WebSocket → `JoinRoom`).

**Architecture rule (embodiment):** this bridge is the **only** campus→WA agent embodiment. Do **not** also run map-script bots (GPT/Tock/Realtime tutorials) as a second “campus agent” fleet. Domain stays in `campus-engine`; WA is spatial presentation. See [`docs/WORKADVENTURE.md`](../../docs/WORKADVENTURE.md).

## Prerequisites

1. WorkAdventure running locally:

```bash
cd workadventure
cp -n .env.template .env
# If play crashes waiting for protos (grpc-tools download fails), generate on the host first:
#   brew install protobuf
#   cd messages && npm install --ignore-scripts
#   protoc --plugin=protoc-gen-ts_proto=./node_modules/.bin/protoc-gen-ts_proto \
#     --ts_proto_out=../libs/messages/src/ts-proto-generated \
#     --ts_proto_opt=outputServices=grpc-js --ts_proto_opt=oneof=unions --ts_proto_opt=esModuleInterop=true \
#     -I ./protos protos/*.proto
docker compose -f docker-compose.yaml -f docker-compose-no-oidc.yaml up -d
# Publish starter into map-storage (required for inline editor /~/ rooms):
bash scripts/upload-starter-to-map-storage.sh
```

Open http://play.workadventure.localhost/~/campus/starter/map.wam — you should see the map editor icon (no OIDC; `MAP_EDITOR_ALLOW_ALL_USERS=true`).

2. Campus core:

```bash
npm run dev:server
```

## Run the bridge

```bash
npm install
npm run start --workspace @agent-campus/wa-bridge
```

Seed agents (Mia, Ivan, …) should appear in the WA room shortly after the bridge connects.

Creating a new agent via viewer/API/CLI (`agent.instantiate`) joins that agent as well.

## Config (env)

| Variable | Default |
|---|---|
| `CAMPUS_WS_URL` | `ws://127.0.0.1:8787` |
| `WA_PLAY_URL` | `http://play.workadventure.localhost` |
| `WA_ROOM_URL` | `{WA_PLAY_URL}/~/campus/starter/map.wam` |
| `WA_CHARACTER_TEXTURE_IDS` | `male1` |
| `WA_JOIN_X` / `WA_JOIN_Y` | `320` / `320` (fallback desk grid) |
| `WA_ROUTINES` | `1` (set `0` to disable idle + work chat) |
| `WA_ROUTINE_IDLE_MS` | `20000` (wander tick) |
| `WA_ROUTINE_WORK_MS` | `90000` (scripted `chat.send` by oficio) |
| `WA_QUEUE_HOLD_MS` | `20000` (QUEUED pause before resume walk) |

With routines on:
- Agents wander **desk / hallway / clock** only (no jitsiChillzone, jitsiMeetingRoom/liveZone, no **start** spawn).
- Never snap/reposition on greet — avoids WA collision shoving the human player.
- On proximity: greet; reply → brief **QUEUED** hold (`WA_QUEUE_HOLD_MS`, default 20s), then resume walking.
- Work chat rotates by `skillKey` (paused spam while hold is active).

## Verify without full WorkAdventure

Unit/integration tests cover the join path against an in-process mock pusher:

```bash
npm test --workspace @agent-campus/wa-bridge
```

Full Docker WorkAdventure needs generated protobufs (`libs/messages/src/ts-proto-generated`). If `docker compose up` fails while downloading `grpc-tools`, fix network access or generate protos, then re-run the stack and this bridge against the real room.

## Out of scope (v1)

Skins, LLM work loops, pathfinding A*, SQL persistence, alive/dormant lifecycle, anonymous workers, auto `task.*` progression.
