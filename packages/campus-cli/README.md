# `@agent-campus/cli` (planned — **low priority**)

Contract only for now. Implement **after** MVP (web/mobile screens + API + memory/comms).

Distributed agent host: join campus, spawn role-bound agents, represent them on the map.

```bash
# planned
npm i -g @agent-campus/cli
campus login --url https://campus.example.com --token …
campus host join --label gpu-box-1
campus agent spawn --archetype arch-systems-eng --name Ada --project proj-demo
```

Domain contract: [`../campus-engine/src/domain/host.ts`](../campus-engine/src/domain/host.ts)
