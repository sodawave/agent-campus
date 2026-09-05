# Spec 048 — WorkAdventure MCP

## Problema

Los agentes en WA se controlan solo vía el proceso `wa-bridge` (sync desde campus).
Los harnesses Cursor/MCP no tienen tools para join/move/say ni upload de mapa
sin editar el submodule.

## Objetivo

MCP **stdio** (`wa-mcp`) en el ambient `engine`, reutilizando `joinWaSession`:

| Tool | Acción |
|------|--------|
| `wa_agents_list` | Sesiones MCP activas |
| `wa_agent_join` | JoinRoom anónimo (sin idle wander) |
| `wa_agent_leave` | Cerrar sesión |
| `wa_agent_move` | moveTo x,y |
| `wa_agent_say` | burbuja de texto |
| `wa_room_url` | URL de sala configurada |
| `wa_map_upload` | Sube starter a map-storage (script monorepo) |

## No-goals

- No editar `workadventure/` submodule.
- No map-script bots.
- No Admin API inversa.
- No aplanar dominio building/room (049).

## Criterios

- `npm run mcp --workspace @agent-campus/wa-bridge` (o bin) sirve tools por stdio.
- Tests unitarios de registry + tools con mock WA.
- typecheck + test verdes; docs INDEX + feasibility actualizados.
