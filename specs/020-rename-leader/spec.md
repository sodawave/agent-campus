# 020 — Rename Boss → Leader (capa 20)

**Rama**: `cursor/spec-020-rename-leader-7599` (sobre `main`) · **Estado**: en implementación · **TDD**

## Objetivo
Renombrar el concepto "Boss" del entorno a **"Leader"** (preferencia de nomenclatura, coherente
con `leaderAgentId`). Rename **completo** (valores + identificadores), sin cambio de comportamiento.

## Alcance (rename completo)
- `RoomRole`: `"boss"` → `"leader"`.
- Constantes: `BOSS_RANK_KEY`/`BOSS_ROOM_ROLE` → `LEADER_RANK_KEY`/`LEADER_ROOM_ROLE` (`"leader"`).
- Helper: `isBossRoom` → `isLeaderRoom`.
- Evento `building.spawned`: campos `bossRoom`/`bossAgent` → `leaderRoom`/`leaderAgent`.
- Comando `building.spawn`: `bossRoomId/bossRoomKey/bossAgentId/bossName` → `leaderRoomId/leaderRoomKey/leaderAgentId/leaderName`; ids derivados `${id}-leader`/`${id}-leader-agent`, `key:"leader"`, `name:"Leader"`.
- `Building.campusLeadAgentId` → `leaderAgentId` (evento `building.lead.assigned` lo aplica).
- Fachada `store.building.spawn` overrides `leader*`.
- Docs `TECH_SPEC` (§2.0/§5.1): Boss office → Leader office; interfaz `Building.leaderAgentId`.

## Sin cambios de comportamiento
Es un rename puro; sin persistencia que migrar (estado en memoria, seed regenerado). `RoomRole`
es union de literales → TypeScript garantiza que no queden usos sueltos.

## Criterios (test-gate, TDD)
- Tests actualizados a Leader (building/store/room/api) en verde.
- `building.spawn` crea Leader office (`role:"leader"`) + agente `Leader` (`rankKey:"leader"`),
  `leaderAgentId` = id del agente.
- typecheck (5 workspaces) + tests (engine 113 + api 6) + build en verde.
