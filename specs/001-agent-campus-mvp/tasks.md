# Tasks: Agent Campus MVP

**Input**: Design documents from `/specs/001-agent-campus-mvp/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Domain unit tests included (needed for SC-002/SC-003); Godot/API smoke per quickstart.md

**Organization**: Tasks grouped by user story for incremental delivery

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1…US8)
- Paths are repo-relative

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Wire monorepo packages for API + tests; keep Godot app scaffold ready

- [ ] T001 Confirm monorepo layout matches plan (`apps/campus-godot`, `packages/campus-engine`, `packages/campus-api`, `deploy/compose`) in `README.md`
- [ ] T002 Initialize `packages/campus-api` package.json + TypeScript + Hono entry in `packages/campus-api/src/index.ts`
- [ ] T003 [P] Add Vitest config for `packages/campus-engine` in `packages/campus-engine/vitest.config.ts`
- [ ] T004 [P] Add Vitest/config scripts for `packages/campus-api` in `packages/campus-api/package.json`
- [ ] T005 [P] Document local env vars in `deploy/compose/.env.example` (API URL, DB, Redis, MinIO)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Persistence, event bus, sample campus seed — blocks all stories

**⚠️ CRITICAL**: No user story work until this phase completes

- [ ] T006 Define Postgres schema/migrations for Campus, Project, Workspace, AgentInstance in `packages/campus-api/src/db/`
- [ ] T007 [P] Implement CampusStore / repository adapters in `packages/campus-api/src/store/` wrapping `campus-engine` types
- [ ] T008 [P] Implement event bus (Redis pub/sub + in-process fanout) in `packages/campus-api/src/events/bus.ts`
- [ ] T009 Implement WS gateway `/v1/ws` emitting `CampusEvent` envelopes in `packages/campus-api/src/ws.ts`
- [ ] T010 Implement shared error mapper (`FORBIDDEN_RANK`, `CALL_REQUIRED`, …) in `packages/campus-api/src/errors.ts`
- [ ] T011 Seed sample campus/catalog/library from `packages/campus-engine/src/catalog/` + `layouts/` into DB seed script `packages/campus-api/src/seed/sample.ts`
- [ ] T012 Wire Compose service `api` to build/run campus-api in `deploy/compose/compose.yml`
- [ ] T013 Expose `GET /v1/campuses/:campusId/snapshot` in `packages/campus-api/src/routes/campuses.ts`

**Checkpoint**: Snapshot + WS skeleton works against Compose

---

## Phase 3: User Story 1 — Ver el campus y la presencia (P1) 🎯 MVP

**Goal**: Operator sees agents in correct offices; online/offline/call presence

**Independent Test**: Sample snapshot shows agents stationed at home; presence events update projection

### Implementation

- [ ] T014 [P] [US1] Ensure presence fields (`hostId`/`runtimeId` optional, presence state) on domain types in `packages/campus-engine/src/domain/types.ts`
- [ ] T015 [US1] Emit `project.loaded` + `agent.presence` on snapshot subscribe in `packages/campus-api/src/routes/campuses.ts`
- [ ] T016 [US1] Godot: boot + campus map scene loading sample layout in `apps/campus-godot/`
- [ ] T017 [US1] Godot: AgentSprite placement by workspace from snapshot/events in `apps/campus-godot/`
- [ ] T018 [US1] Godot: select agent → show name, craft, rank HUD

**Checkpoint**: Map shows sample campus presence (SC-001 partial / SC-008 start)

---

## Phase 4: User Story 2 — Instanciar desde catálogo (P1)

**Goal**: Add → archetype → name → spawn → intro → home

**Independent Test**: POST agent + events; sprite appears and homes

### Implementation

- [ ] T019 [P] [US2] Domain helper tests for instantiate + natural department homing in `packages/campus-engine/src/domain/__tests__/spawn.test.ts`
- [ ] T020 [US2] `GET /v1/campuses/:campusId/catalog/archetypes` in `packages/campus-api/src/routes/catalog.ts`
- [ ] T021 [US2] `POST /projects/:projectId/agents` applying engine rules + emit `agent.instantiated` / `agent.introducing` / `agent.homing` in `packages/campus-api/src/routes/agents.ts`
- [ ] T022 [US2] Godot catalog modal + instantiate intent in `apps/campus-godot/`
- [ ] T023 [US2] Godot intro/homing animation driven by events

**Checkpoint**: Full spawn journey on map (SC-001)

---

## Phase 5: User Story 3 — Organigrama, órdenes, evaluación (P1)

**Goal**: Org surface; debate/eval hierarchy enforced

**Independent Test**: Domain battery for debate/eval; org UI lists hierarchy

### Implementation

- [ ] T024 [P] [US3] Expand org rule tests in `packages/campus-engine/src/domain/__tests__/org.test.ts`
- [ ] T025 [P] [US3] Task/order/evaluation domain coverage in `packages/campus-engine/src/domain/__tests__/tasks.test.ts`
- [ ] T026 [US3] `GET /projects/:projectId/org` + debates/orders/evaluations routes in `packages/campus-api/src/routes/org.ts`
- [ ] T027 [US3] Emit `debate.*`, `order.created`, `task.evaluated` events
- [ ] T028 [US3] Godot org_tasks surface (mindmap/list) consuming org endpoint in `apps/campus-godot/`

**Checkpoint**: SC-003 hierarchy battery green; org screen usable (SC-004)

---

## Phase 6: User Story 4 — Chats (P2)

**Goal**: Thread with named agent; context stack = craft ⊕ building ⊕ corresponding office

**Independent Test**: Send message; agent reply uses correct context summary

### Implementation

- [ ] T029 [P] [US4] Context stack helper tests in `packages/campus-engine/src/domain/__tests__/context.test.ts`
- [ ] T030 [US4] Threads/messages routes + `chat.message` events in `packages/campus-api/src/routes/chats.ts`
- [ ] T031 [US4] Minimal agent reply adapter (stub LLM OK) using context stack in `packages/campus-api/src/agents/reply.ts`
- [ ] T032 [US4] Godot chats surface in `apps/campus-godot/`

**Checkpoint**: Three surfaces navigable (SC-004)

---

## Phase 7: User Story 5 — Workers anónimos (P2)

**Goal**: `ic` spawn/destroy; map enter/exit

**Independent Test**: Only `ic` succeeds; non-spawner destroy fails

### Implementation

- [ ] T033 [P] [US5] Worker tests in `packages/campus-engine/src/domain/__tests__/workers.test.ts`
- [ ] T034 [US5] Worker routes + `worker.entered` / `worker.exited` in `packages/campus-api/src/routes/workers.ts`
- [ ] T035 [US5] Godot enter/exit presentation for anonymous workers in `apps/campus-godot/`

**Checkpoint**: Worker lifecycle visible on map

---

## Phase 8: User Story 6 — ProjectCall (P2)

**Goal**: Cross-building presence only via call; return home

**Independent Test**: Move without call rejected; accept/close round-trip (SC-002, SC-005)

### Implementation

- [ ] T036 [P] [US6] Call lifecycle tests in `packages/campus-engine/src/domain/__tests__/calls.test.ts`
- [ ] T037 [US6] Call routes (issue/accept/close/reject) in `packages/campus-api/src/routes/calls.ts`
- [ ] T038 [US6] Emit call + `agent.building.entered` / `agent.returned_home` events
- [ ] T039 [US6] Godot: show agent in destination corresponding office during call

**Checkpoint**: SC-002 / SC-005 satisfied

---

## Phase 9: User Story 7 — Library + MemPalace (P3)

**Goal**: Docs by craft; episodic remember/recall agent + project

**Independent Test**: Same skill in two buildings shares classifications; recall scopes work (SC-007)

### Implementation

- [ ] T040 [P] [US7] Library helper tests in `packages/campus-engine/src/domain/__tests__/library.test.ts`
- [ ] T041 [P] [US7] Memory scope tests in `packages/campus-engine/src/domain/__tests__/memory.test.ts`
- [ ] T042 [US7] Library routes + MinIO blob hook in `packages/campus-api/src/routes/library.ts`
- [ ] T043 [US7] MemPalace adapter (dev/local OK) in `packages/campus-api/src/memory/mempalace.ts`
- [ ] T044 [US7] Remember/recall routes + memory events in `packages/campus-api/src/routes/memory.ts`
- [ ] T045 [US7] Wire reply adapter to library + recall scopes in `packages/campus-api/src/agents/reply.ts`

**Checkpoint**: SC-007 demo path

---

## Phase 10: User Story 8 — Spec Kit por edificio (P3)

**Goal**: Opt-in SDD; phase + artifacts; link orders

**Independent Test**: Enable → artifact → phase change (SC-006)

### Implementation

- [ ] T046 [P] [US8] Spec Kit domain tests in `packages/campus-engine/src/domain/__tests__/speckit.test.ts`
- [ ] T047 [US8] Spec Kit routes in `packages/campus-api/src/routes/speckit.ts`
- [ ] T048 [US8] Emit `speckit.phase.changed` / `speckit.artifact.upserted`
- [ ] T049 [US8] Allow `specKitArtifactId` on orders in `packages/campus-api/src/routes/org.ts`
- [ ] T050 [US8] Godot panel (minimal) to view project Spec Kit phase in `apps/campus-godot/`

**Checkpoint**: SC-006 demonstrable

---

## Phase 11: Polish & Cross-Cutting

**Purpose**: Exports, docs, quickstart validation

- [ ] T051 [P] Run domain + API test suites; fix failures
- [ ] T052 [P] Update `docs/TECH_SPEC.md` status to reflect Spec Kit feature + API progress
- [ ] T053 Desktop export smoke from `apps/campus-godot` (SC-008)
- [ ] T054 [P] Web or one mobile export smoke (SC-008)
- [ ] T055 Execute `specs/001-agent-campus-mvp/quickstart.md` checklist end-to-end
- [ ] T056 Mark CLI host explicitly deferred in `packages/campus-cli/README.md` (no implementation)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup → Foundational → US1 → US2 → US3** for thinnest MVP (map + spawn + org)
- **US4–US6** after foundational; US4 benefits from US2 agents; US6 needs multi-project seed
- **US7–US8** after chats/org exist (reply + orders linkage)
- **Polish** after desired stories

### User Story Dependencies

| Story | Depends on |
|-------|------------|
| US1 Presence | Foundational |
| US2 Spawn | US1 (map projection) |
| US3 Org | Foundational; sample agents (seed or US2) |
| US4 Chats | US2 (named agents) |
| US5 Workers | US1 map; org ranks seeded |
| US6 Calls | US1 + ≥2 projects in seed |
| US7 Memory | US4 reply path helpful |
| US8 Spec Kit | US3 orders optional link |

### Parallel Opportunities

- T003/T004/T005 in Setup
- T007/T008 in Foundational
- Domain test tasks marked [P] across stories
- Godot surfaces (org vs chats) after snapshot client exists

---

## Parallel Example: After Foundational

```bash
# Domain tests in parallel:
Task: "T019 spawn tests"
Task: "T024 org tests"
Task: "T033 worker tests"
Task: "T036 call tests"

# API route modules in parallel once store/bus exist:
Task: "T020 catalog routes"
Task: "T026 org routes"
Task: "T034 worker routes"
```

---

## Implementation Strategy

### MVP First (US1 + US2 + US3)

1. Setup + Foundational  
2. Presence map (US1)  
3. Catalog spawn (US2)  
4. Org hierarchy (US3)  
5. **STOP** — demo map + spawn + org

### Incremental

6. Chats (US4) → three surfaces  
7. Workers (US5) + Calls (US6)  
8. Library/MemPalace (US7) + Spec Kit (US8)  
9. Polish / exports / quickstart

### Notes

- Do not implement CLI hosts in this feature  
- Prefer failing domain tests before API wiring for rule-heavy stories  
- Commit after each story checkpoint
