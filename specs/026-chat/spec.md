# 026 — Chat (dominio) (capa 26)

**Rama**: `cursor/spec-026-chat-7599` (sobre `main`) · **TDD**

## Objetivo
Cerrar el hueco de dominio documentado (§15.1): **mensajería usuario↔agente**. Un hilo por
agente nombrado.

## Alcance
- `ChatMessage { id, agentId, from: "user"|"agent", text }`; `State.messages[]`.
- Comando `chat.send` (+ evento `chat.message.posted`; reasons `agent_not_found`, `duplicate_id`).
- Helper `messagesForAgent`; fachada `chat.send`; builder `buildChatMessage`.

## Fuera de alcance
- Tipado rico de mensajes, adjuntos, streaming; chat de workers anónimos.

## Criterios (test-gate, TDD)
- `chat.send` añade mensajes al hilo del agente en orden (user/agent).
- Mensajes scoped por agente.
- Rechazos: `agent_not_found`, `duplicate_id`.
- typecheck (5) + tests (engine 129 + api 10) + build en verde.
