# Contract: CampusEvent stream (MVP)

**Transport**: WebSocket `/v1/ws` (subscribe by `campusId` / `projectId`)  
**Semantics**: Append-only event log for clients to project UI; server applies domain rules before emit.

## Envelope

```json
{
  "id": "evt_…",
  "type": "agent.instantiated",
  "campusId": "…",
  "projectId": "…",
  "at": "2026-08-28T00:00:00.000Z",
  "payload": {}
}
```

Clients MUST apply events idempotently by `id`.

## Event catalog (MVP)

### Presence & agents

| type | payload (conceptual) |
|------|----------------------|
| `project.loaded` | project snapshot meta |
| `agent.instantiated` | agent, peerIds |
| `agent.introducing` | agentId, active |
| `agent.homing` | agentId, homeWorkspaceId |
| `agent.moved` | agentId, workspaceId, projectId |
| `agent.presence` | agentId, state: online\|offline |

### Calls

| type | payload |
|------|---------|
| `project.call.issued` | call |
| `project.call.accepted` | call, agent location |
| `project.call.closed` | call |
| `agent.returned_home` | agentId, home refs |
| `agent.building.entered` | agentId, projectId, callId, workspaceId? |

### Workers

| type | payload |
|------|---------|
| `worker.entered` | worker, spawnedById |
| `worker.exited` | workerId |

### Org / tasks / chat

| type | payload |
|------|---------|
| `debate.opened` / `debate.closed` | debate |
| `order.created` / `task.updated` | order/task |
| `task.evaluated` | evaluation |
| `chat.message` | threadId, message |

### Memory & Spec Kit

| type | payload |
|------|---------|
| `memory.remembered` | scope: agent, refs |
| `memory.project.remembered` | projectId, refs |
| `memory.recalled` | agentId, hit meta (optional) |
| `speckit.phase.changed` | projectId, phase, convergence |
| `speckit.artifact.upserted` | artifact |

## Client rules

1. Godot MUST NOT invent hierarchy/call outcomes; wait for events or HTTP error.
2. Intents (spawn, call, evaluate) go HTTP; success confirmed by event and/or response body.
3. Map sprites bind to `agent.*` / `worker.*` / `project.call.*` only.
4. Unknown event types MUST be ignored forward-compatibly.
