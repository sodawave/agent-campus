# 013 — Host / runtime: plano de ejecución (capa 13)

**Rama**: `cursor/spec-013-host-runtime-7599` (sobre `main`) · **Estado**: en implementación

## Objetivo
Modelar el **plano de ejecución**: hosts (máquinas) que se unen al campus y **runtimes**
vivos que alimentan a los agentes. Un agente está *vivo* cuando tiene `hostId`+`runtimeId`
(Constitución: **un runtime por agente**; no vivo en dos hosts a la vez).

## Alcance
- `AgentHost { id, label, status }`; `AgentRuntime { id, hostId, agentId, status, workingDir? }`;
  `AgentInstance.hostId?`/`runtimeId?`; `State.hosts[]`, `State.runtimes[]`.
- Comandos `host.join` / `host.leave` / `runtime.start` / `runtime.stop`. Eventos
  `host.joined` / `host.left` / `runtime.started` / `runtime.stopped`.
- Helpers `isAgentLive`, `liveRuntimeForAgent`; fachada `host.*` y `runtime.*`.

## Reglas
- `runtime.start`: host existente y **online**, agente existente, agente **no vivo ya**, id único.
- `runtime.stop`: pone al agente offline y permite reiniciar.
- `host.leave`: detiene sus runtimes y deja offline a esos agentes.

## Fuera de alcance
Binario CLI real · heartbeat/telemetría · sandbox de ficheros (solo se guarda `workingDir` como metadato).

## Criterios (test-gate)
- Al iniciar runtime, el agente queda vivo (`hostId`+`runtimeId`); `workingDir` guardado.
- Un segundo `runtime.start` para el mismo agente vivo → `agent_already_live`.
- `runtime.stop` → agente offline y reiniciable.
- `host.leave` detiene runtimes y deja agentes offline.
- Rechazos: `host_not_found`, `host_offline`, `agent_not_found`, `runtime_not_found`, `duplicate_id`.
- typecheck (engine+apps) + tests + build en verde.
