# 036 — Ámbito por oficio + rankear (capa 36)

**Rama**: `cursor/spec-036-oficio-rank-7599` (sobre `main`) · **TDD**

## Contexto
"Lógica entre agentes". La **presentación como gate de descubrimiento** se aplaza
hasta que exista el harness/runtime vivo que la consuma (no hay ocultación de
información en un estado event-sourced totalmente visible; sería mecanismo sin
llamador). Esta capa entrega solo lo barato y con hueco real:

1. El **eje de oficio** del ámbito como **derivaciones puras** (sin estado nuevo).
2. **Rankear**: que el superior pueda ajustar el `rankKey` (hoy es write-once al
   instanciar).

## Alcance
- Helpers puros en `org.ts` (ámbito = agentes nombrados del **mismo building**,
  excluyendo el propio; los workers anónimos no cuentan):
  - `colegasForAgent(state, agentId)` → mismo `skillKey` (oficio igual; requiere
    `skillKey` definido). Para debate/split del mismo craft.
  - `companerosForAgent(state, agentId)` → resto del ámbito (oficio distinto). Para
    consulta cruzada. Partición: `colegas ∪ companeros = ámbito \ {self}`.
  - `bestProfileFor(state, agentId, { sameSkill })` → "mejor perfil" para
    consultar/debatir: entre los candidatos (colegas si `sameSkill`, si no
    compañeros) prefiere un **jefe de departamento** (`room.headAgentId`); si no
    hay, el primero determinista por id; `null` si no hay candidatos.
- Comando `agent.rank { agentId, rankKey, byId }` (+ evento `agent.ranked`):
  autoridad = **supervisor directo** del agente **o** el **leader del building**
  (no self por la vía leader). Rechazos: `agent_not_found`, `not_supervisor`.
  Reduce fija `agent.rankKey`. Fachada `agent.rank`.

## Fuera de alcance (cuando exista el runtime vivo)
- `agent.introduce` + flag `introduced` + gate de descubrimiento + `introduction.*`.
- Escala formal de rangos (`Rank.level`); consulta/orden gobernada agente↔agente.

## Criterios (test-gate, TDD)
- `colegasForAgent`/`companerosForAgent` particionan el ámbito por oficio.
- `bestProfileFor` prefiere el head; determinista; `null` sin candidatos.
- `agent.rank`: supervisor y leader pueden; otros → `not_supervisor`; agente
  inexistente → `agent_not_found`; el `rankKey` cambia en el estado.
- typecheck + tests (engine) + build en verde.
