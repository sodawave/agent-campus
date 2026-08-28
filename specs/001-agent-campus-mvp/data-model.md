# Data Model: Agent Campus MVP

**Feature**: `specs/001-agent-campus-mvp`  
**Source of truth (code)**: `packages/campus-engine/src/domain/`

## Entity overview

```text
Campus
  ├── Library (docs + classifications by Skill.key)
  ├── MemPalace palace ref
  └── Project[] (= buildings)
        ├── ranks[], context, memoryWingId, specKit?
        ├── Workspace[] (= offices)
        ├── AgentInstance[] (named | anonymous_worker)
        ├── ProjectCall[]
        ├── DebateSession / Task / Order / Evaluation
        └── SpecKitArtifact[] (when enabled)
```

## Entities

### Campus
| Field | Notes |
|-------|--------|
| id, name | Identity |
| libraryId | Campus-scoped library |
| projectIds | Buildings in this campus |
| memoryPalaceRef | Optional MemPalace palace id |

### Project (Building)
| Field | Notes |
|-------|--------|
| id, campusId, name | Identity |
| context | BuildingContext (mission, product, …) |
| ranks | Rank ladder (default includes `ic`…`campus_lead`) |
| memoryWingId | Shared episodic wing (default project id) |
| specKit | Optional SDD state (phase, convergence) |
| campusLeadAgentId | Optional |

**Validation**: ranks must have unique keys/levels; `ic` present if workers enabled.

### Workspace (Office)
| Field | Notes |
|-------|--------|
| id, projectId, key, name | Identity; `key` = department key |
| context | DepartmentContext specialization |
| headAgentId | Optional department head |
| role | briefing / ops / hallway / library / … |

**Validation**: `key` unique within project; used for natural department homing.

### Skill / AgentArchetype (Catalog)
| Field | Notes |
|-------|--------|
| Skill.key | Craft key → library classifications |
| naturalDepartmentKey | Homing target workspace key |
| defaultRankKey, defaultHarness | Spawn defaults |
| spriteKey | Client presentation hint |

### AgentInstance
| Field | Notes |
|-------|--------|
| id, kind | `named` \| `anonymous_worker` |
| name, skill, harness, rankKey | Identity + craft |
| supervisorId | Reporting line |
| homeProjectId, homeWorkspaceId | Station |
| projectId, workspaceId | Current location |
| activeCallId | Null unless on ProjectCall |
| spawnedById | Workers only |
| hostId / runtimeId | Presence (optional; MVP may leave null) |

**Validation**:
- Named agents require catalog/archetype skill.
- Workers require `spawnedById` with spawner rank `ic`.
- Without `activeCallId`, `projectId`/`workspaceId` must stay at home (except intra-building presentation).

### ProjectCall
| Field | Notes |
|-------|--------|
| id, fromProjectId, toAgentId | Call identity |
| status | issued / accepted / closed / rejected |
| correspondingWorkspaceId? | Destination office if mapped |

**Transitions**: `issued → accepted → closed` or `issued → rejected`.

### Library
| Field | Notes |
|-------|--------|
| LibraryDocument | kind, title, source, classificationIds |
| DocClassification | key, vectorNamespace, skillKeys[] |

**Validation**: classifications bind by skill keys, never by instance id.

### Memory (episodic)
| Scope | Keying |
|-------|--------|
| Agent | wing ≈ agent id |
| Project | wing ≈ memoryWingId |
| Room/drawer | department / topic / verbatim drawer |

### Spec Kit (per project)
| Field | Notes |
|-------|--------|
| phase | constitution…converge |
| convergence | diverged / in_progress / converged |
| artifacts | SpecKitArtifact (kind, path/ref, content meta) |

### Org ops
| Entity | Rules |
|--------|--------|
| DebateSession | participants same rank |
| Task / Order | assignee within reporting rules |
| TaskEvaluation | evaluator must be direct supervisor of assignee |

### Anonymous Worker
Ephemeral `AgentInstance` with `kind: anonymous_worker`; map enter/exit events; destroy only by spawner.

## State machines (summary)

**Agent presence (visual)**: Spawning → Introducing → Idle ↔ Walking → OccupyingAnchor; Offline if no live presence.

**Call**: see ProjectCall transitions.

**Spec Kit phase**: monotonic product workflow (allow explicit reopen/diverge flag via convergence field).

## Relationships (cardinality)

- Campus 1—* Project
- Project 1—* Workspace
- Project 1—* AgentInstance
- AgentInstance *—1 Skill (craft)
- AgentInstance 0—1 active ProjectCall
- Library 1—* DocClassification *—* Skill (by key)
- Project 0—1 SpecKit state 1—* Artifact
