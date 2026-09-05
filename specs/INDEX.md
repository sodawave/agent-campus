# Specs index — Agent Campus

Índice vivo de features Spec Kit. Convención: **1 spec = 1 rama = 1 PR**.

## Activas / backlog (post–WorkAdventure)

| Spec | Slug | Estado | Notas |
|------|------|--------|-------|
| **044** | [speckit-restore](./044-speckit-restore/) | done | Skills Cursor + este índice |
| **045** | [wa-submodule](./045-wa-submodule/) | done | WA `@ v1.33.5` submodule; no editar vendor |
| **046** | [engine-encapsulate](./046-engine-encapsulate/) | done | Todo campus → `engine/`; `packages/engine` (`@agent-campus/engine`); drop godot/viewer |
| **047** | [wa-spatial-contract](./047-wa-spatial-contract/) | done | mapa WA = building; room = espacio privado; [MCP feasibility](../docs/wa-mcp-feasibility.md) |
| **048** | [wa-mcp](./048-wa-mcp/) | done | MCP `wa-mcp` / `npm run mcp:wa` |

### Siguiente (sugerido)

| Spec | Slug | Notas |
|------|------|-------|
| **049** | engine-flatten-spatial | Aplanar building/room en dominio hacia el contrato 047 |
| **050** | admin-create-map | control-panel crea mapas (buildings) vía map-storage |

Checkpoint git previo: tag `checkpoint/pre-engine-encapsulate`.

## Superseded (espacial Godot)

Presentación espacial canónica = **WorkAdventure** + `apps/wa-bridge`. Ver [docs/WORKADVENTURE.md](../docs/WORKADVENTURE.md).

| Spec | Slug | Motivo |
|------|------|--------|
| **041** | [godot-viewer](./041-godot-viewer/) | Visor espacial Godot — superseded por WA |
| **042** | [skins-appearance](./042-skins-appearance/) | Skins orientadas a Godot — parcialmente legado; UI espacial → WA |
| **043** | [campus-view](./043-campus-view/) | Diorama Godot — superseded por WA |

## Histórico (selección)

Specs `008`–`034` y anteriores: dominio/org/MCP/control-panel — vigentes en código; paths se moverán en **046**.

## Flujo

```text
specify → clarify → plan → tasks → implement → converge
```

- Cursor: `.cursor/skills/speckit-*` → `/speckit-specify`, …
- opencode: `.opencode/commands/speckit.*.md` → `/speckit.specify`, …
