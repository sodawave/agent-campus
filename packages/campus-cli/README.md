# `@agent-campus/cli` (planned)

Distributed **agent host**. Install on any machine to instantiate agents with
roles, keep them alive, connect to a campus, and have them **represented** in
the correct office on the map.

```bash
# planned
npm i -g @agent-campus/cli
campus login --url https://campus.example.com --token …
campus host join --label gpu-box-1
campus agent spawn --archetype arch-systems-eng --name Ada --project proj-demo
```

Domain contract: [`../campus-engine/src/domain/host.ts`](../campus-engine/src/domain/host.ts)
