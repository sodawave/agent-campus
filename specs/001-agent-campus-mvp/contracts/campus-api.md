# Contract: Campus HTTP API (MVP)

**Consumers**: Godot client (primary), optional tools  
**Owner**: `packages/campus-api` (to implement) over `campus-engine` rules

Base path: `/v1`

## Auth (MVP assumption)

- Session or bearer token for operator actions.
- Unauthenticated read of sample campus MAY be allowed in local Compose demos.

## Resources

### Campus

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/campuses/:campusId` | Campus summary + project ids |
| GET | `/campuses/:campusId/snapshot` | Full projectable snapshot (projects, workspaces, agents, calls) |

### Catalog

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/campuses/:campusId/catalog/archetypes` | List archetypes for spawn UI |

### Agents

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/projects/:projectId/agents` | Instantiate named agent `{ archetypeId, name, workspaceId? }` |
| GET | `/agents/:agentId` | Agent detail + context stack summary |
| POST | `/agents/:agentId/return-home` | Force return if call closed / recovery |

### Project calls

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/projects/:projectId/calls` | Issue call `{ toAgentId }` |
| POST | `/calls/:callId/accept` | Accept → relocate |
| POST | `/calls/:callId/close` | Close → return home |
| POST | `/calls/:callId/reject` | Reject issued call |

### Org / tasks

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/projects/:projectId/org` | Hierarchy projection |
| POST | `/projects/:projectId/debates` | Start debate (same-rank check) |
| POST | `/projects/:projectId/orders` | Create order/task assignment |
| POST | `/tasks/:taskId/evaluations` | Evaluate (supervisor check) |

### Workers

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/agents/:agentId/workers` | Spawn anonymous worker (must be `ic`) |
| DELETE | `/agents/:agentId/workers/:workerId` | Destroy own worker |

### Chats

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/agents/:agentId/threads` | List threads |
| POST | `/agents/:agentId/threads` | Open thread |
| POST | `/threads/:threadId/messages` | Send operator message |
| GET | `/threads/:threadId/messages` | History |

### Library & memory

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/campuses/:campusId/library/documents` | List / filter by skillKey |
| POST | `/campuses/:campusId/library/documents` | Register document + classifications |
| POST | `/agents/:agentId/memory/remember` | Remember agent episode |
| POST | `/projects/:projectId/memory/remember` | Remember project episode |
| POST | `/agents/:agentId/memory/recall` | Recall with scopes |

### Spec Kit

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/projects/:projectId/speckit/enable` | Opt-in SDD |
| GET | `/projects/:projectId/speckit` | Phase + artifacts |
| POST | `/projects/:projectId/speckit/phase` | Advance / set phase |
| POST | `/projects/:projectId/speckit/artifacts` | Upsert artifact |
| POST | `/orders` (or task create) | MAY include `specKitArtifactId` |

## Error model

JSON `{ "error": { "code": string, "message": string } }`

Notable codes: `FORBIDDEN_RANK`, `HIERARCHY_VIOLATION`, `CALL_REQUIRED`, `CALL_ACTIVE`, `NOT_SPAWNER`, `NOT_FOUND`, `VALIDATION`.

## Non-goals (MVP)

- CLI host join/heartbeat endpoints (contract reserved; not required to ship).
- Plugin runtime management beyond listing panel metadata.
