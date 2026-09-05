# Bugbot — review gates (Agent Campus)

Revisa cada PR contra estas reglas. Marca como bloqueante lo que viole invariantes de arquitectura.

## Bloqueante

- **Sin lógica de negocio en clientes** (`apps/*`). Los clientes solo proyectan estado y emiten Commands; las reglas viven en `engine/packages/engine`.
- **`domain/` no importa render ni store**; el store no importa código de cliente. Mantener los tres planos separados (control / ejecución / presentación).
- **Reducer puro e idempotente**: `reduce(state, event)` no hace I/O, no muta argumentos, y reaplicar un evento no cambia el resultado.
- **Eventos**: todo `CampusEvent` nuevo debe tener su case en `reduce` y ser JSON-serializable (contrato neutral de lenguaje).
- **Tests**: cambios en dominio/store deben incluir o mantener pruebas Vitest. No bajar cobertura de reglas existentes.
- **Agentes no se clonan** entre edificios: la movilidad es vía `ProjectCall` (préstamo), que mueve `projectId`, nunca duplica instancias ni cambia `hostId`.
- **Scope de PR**: una sola spec por PR (protocolo 1 spec = 1 rama = 1 PR).

## Advertir

- Código espagueti / duplicación que debería extraerse a un helper puro.
- Fachada del store incoherente (acción que no sigue el patrón entidad → constructor puro + método + case en reduce).
- Task sin test-gate (dar por hecha una tarea sin verificación).
- Imports no `type`-only cuando corresponde (`verbatimModuleSyntax`).
