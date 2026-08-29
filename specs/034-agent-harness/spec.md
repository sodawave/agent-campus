# 034 — Harness por agente (capa 34)

**Rama**: `cursor/spec-034-harness-7599` (sobre `main`) · **TDD**

## Objetivo
Cada agente elige su **harness** (proveedor/modelo del catálogo + knobs). Cierra la cadena:
Control Panel define proveedores/modelos → el agente selecciona el suyo.

## Alcance
- `AgentHarness { providerId, model, temperature?, effort?, maxTokens? }`; `AgentInstance.harness?`.
- Comando `agent.setHarness { agentId, providerId, model, temperature?, effort?, maxTokens? }`
  (+ evento `agent.harness.set`). Valida: `agent_not_found`, `provider_not_found`,
  `model_not_in_provider` (contra `config.providers`). Fachada `agent.setHarness`.

## Fuera de alcance (opcional siguiente)
- Exponer `setHarness` en GraphQL/MCP + editor en Control Panel; default heredado del `config.defaultModel`.

## Criterios (test-gate, TDD)
- `setHarness` fija provider/model (+ knobs) validado contra el catálogo.
- Rechazos: agente/proveedor inexistente, modelo no en el proveedor.
- typecheck (5) + tests (engine 142 + api 16) + build en verde.
