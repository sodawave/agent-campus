# 027 — Chat en MCP + viewer (capa 27)

**Rama**: `cursor/spec-027-chat-surface-7599` (sobre `main`)

## Objetivo
Exponer el dominio `chat` (capa 26) por las superficies: **MCP** (harnesses) y **viewer** (usuario).

## Alcance
- `apps/api`: tools `chat_send` (enviar mensaje user/agent) y `chat_history` (leer hilo del agente).
- `apps/viewer`: panel **Chat (per agent)** (hilo por agente) + botón "Message 1st agent".
- `apps/server`: seed con un hilo de chat (Mia).

## Criterios (test-gate + demo)
- MCP: `chat_send` + `chat_history` round-trip (TDD).
- Viewer: el panel muestra el hilo del seed; enviar mensaje en vivo lo añade (`✓ chat.message.posted`).
- typecheck (5) + tests (engine 129 + api 11) + build en verde.
