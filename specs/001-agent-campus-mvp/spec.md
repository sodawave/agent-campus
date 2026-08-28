# Feature Specification: Agent Campus MVP

**Feature Branch**: `cursor/agent-campus-mvp-2319`

**Created**: 2026-08-28

**Status**: Draft

**Input**: User description: "Agent Campus MVP: campus gamificado multiplataforma con proyectos-edificios, oficinas, agentes por oficio, memoria Library+MemPalace, Spec Kit por edificio, y superficies mapa/org/chat"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Ver el campus y la presencia de agentes (Priority: P1)

Como operador del campus, abro el cliente y veo un mapa del campus con edificios (proyectos) y oficinas (departamentos). Los agentes nombrados aparecen en su oficina natural. Puedo distinguir quién está en casa, quién está en llamada a otro edificio, y quién está offline / sin presencia viva.

**Why this priority**: Sin presencia espacial no hay producto gamificado ni metáfora operativa; es el núcleo observable del MVP.

**Independent Test**: Con un campus de muestra (al menos un edificio, dos oficinas, tres agentes), el operador ve sprites/figuras en las oficinas correctas y puede seleccionar un agente para ver nombre, oficio y rango.

**Acceptance Scenarios**:

1. **Given** un campus con un proyecto cargado y agentes estacionados en home, **When** el operador abre la superficie de gamificación, **Then** cada agente nombrado aparece en su oficina natural.
2. **Given** un agente con llamada activa a otro proyecto, **When** el operador mira el mapa, **Then** ese agente aparece en la oficina correspondiente del edificio llamante (si existe) y no en su home.
3. **Given** un agente sin presencia viva, **When** el operador mira el mapa, **Then** el agente no “habita” la oficina como figura activa (offline / idle offline).

---

### User Story 2 - Instanciar un agente desde el catálogo (Priority: P1)

Como operador, desde una oficina elijo **Añadir**, selecciono un arquetipo del catálogo (oficio), le doy un nombre, confirmo, y el agente aparece, se presenta a sus pares y vuelve a su departamento natural si existe.

**Why this priority**: Sin instanciación no hay plantilla viva; es el flujo de creación principal.

**Independent Test**: Catálogo con ≥2 arquetipos; instanciar uno en una oficina; verificar nombre, oficio, oficina home y que no cambia de oficio al pasar por otra sala.

**Acceptance Scenarios**:

1. **Given** una oficina y un catálogo disponible, **When** el operador elige arquetipo, nombre y confirma, **Then** se crea una instancia nombrada en esa oficina (o en la de entrada) y queda ligada a su oficio del catálogo.
2. **Given** un arquetipo con departamento natural existente en el edificio, **When** termina la introducción, **Then** el agente se estaciona en esa oficina home.
3. **Given** un agente estacionado, **When** el operador lo mueve visualmente o lo observa en otra sala del mismo edificio sin llamada, **Then** el agente sigue razonando / etiquetado como su oficio original (no adopta la especialización de la sala visitada).

---

### User Story 3 - Organigrama, órdenes y evaluación (Priority: P1)

Como operador, abro la superficie de organigrama/tareas, veo la jerarquía del proyecto, asigno o observo órdenes, y compruebo que solo el supervisor directo puede evaluar el trabajo de un report.

**Why this priority**: El mapa observa; el organigrama controla. Sin ops no hay producto de trabajo.

**Independent Test**: Tres agentes en cadena supervisor→report; intentar debate entre rangos distintos (debe fallar); evaluación solo por supervisor directo (debe pasar / fallar según actor).

**Acceptance Scenarios**:

1. **Given** un proyecto con rangos y reporting lines, **When** el operador abre org/tareas, **Then** ve la jerarquía y puede inspeccionar tareas u órdenes del proyecto.
2. **Given** dos agentes del mismo rango, **When** se inicia un debate entre ellos, **Then** el sistema lo permite.
3. **Given** dos agentes de rango distinto sin relación peer/supervisor-report, **When** se intenta debate o asignación saltando jerarquía, **Then** el sistema lo rechaza.
4. **Given** una tarea de un report, **When** alguien que no es el supervisor directo intenta evaluar, **Then** la evaluación se rechaza; **When** el supervisor directo evalúa, **Then** se registra el veredicto.

---

### User Story 4 - Chatear con un agente (Priority: P2)

Como operador, abro la superficie de chats, elijo una instancia nombrada y mantengo un hilo. El agente responde usando su oficio, el contexto del edificio actual y la especialización de la oficina correspondiente (no de una sala aleatoria visitada).

**Why this priority**: Conversación es la tercera superficie first-class; depende de instancias y contexto ya definidos.

**Independent Test**: Abrir chat con un agente de marketing en el edificio A; verificar que el contexto de razonamiento refleja oficio + building A + oficina de marketing (si existe), aunque el sprite esté de paso por el pasillo.

**Acceptance Scenarios**:

1. **Given** al menos un agente nombrado, **When** el operador abre chats y selecciona ese agente, **Then** ve (o crea) un hilo y puede enviar un mensaje.
2. **Given** un mensaje del operador, **When** el agente responde, **Then** la respuesta se ancla al oficio del agente y al contexto del edificio/oficina correspondiente actuales.
3. **Given** un agente en llamada en otro edificio, **When** el operador chatea con él, **Then** el contexto de especialización usa la oficina correspondiente del edificio de la llamada, no la home.

---

### User Story 5 - Workers anónimos entrar/salir (Priority: P2)

Como agente de rango más bajo (`ic`), puedo spawnear workers anónimos que aparecen entrando al campus y destruir los que yo creé, viéndolos salir.

**Why this priority**: Refuerza la gamificación y la jerarquía operativa; no bloquea las tres superficies si se aplaza, pero está en constitución.

**Independent Test**: Actor `ic` spawnea worker → figura entra; actor no-`ic` intenta spawnear → rechazo; solo el spawner destruye sus workers.

**Acceptance Scenarios**:

1. **Given** un agente de rango `ic`, **When** spawnea un worker anónimo, **Then** aparece una figura anónima entrando al campus y queda asociada al spawner.
2. **Given** un agente de rango superior a `ic`, **When** intenta spawnear un worker, **Then** el sistema lo rechaza.
3. **Given** un worker creado por el agente A, **When** A lo destruye, **Then** la figura sale del campus; **When** otro agente intenta destruirlo, **Then** se rechaza.

---

### User Story 6 - Llamada entre proyectos (Priority: P2)

Como operador o agente autorizado, emito una llamada de un proyecto a un agente de otro; al aceptar, el agente va al edificio llamante (oficina correspondiente) y al cerrar vuelve a home.

**Why this priority**: Única forma legítima de movilidad inter-edificio; sin esto el campus multi-edificio queda aislado.

**Independent Test**: Dos edificios con oficinas homologables; emitir → aceptar → verificar ubicación; cerrar → verificar retorno home.

**Acceptance Scenarios**:

1. **Given** un agente en home sin llamada, **When** alguien intenta moverlo a otro edificio sin `ProjectCall`, **Then** el sistema lo impide.
2. **Given** una llamada emitida hacia un agente, **When** el agente acepta, **Then** pasa al proyecto llamante y a la oficina correspondiente si existe.
3. **Given** una llamada activa, **When** se cierra, **Then** el agente vuelve a su edificio y oficina home.

---

### User Story 7 - Biblioteca y memoria episódica (Priority: P3)

Como operador o agente, consulto documentos de la biblioteca del campus filtrados por oficio, y el sistema recuerda episodios a nivel de agente y de proyecto (edificio) para recall en conversación/trabajo.

**Why this priority**: Diferencia el producto de un chat genérico; puede entrar tras las tres superficies básicas.

**Independent Test**: Subir/clasificar un manual ligado a un oficio; un agente de ese oficio lo recupera en contexto; recordar un episodio de proyecto y verificar que otro agente del mismo edificio puede recallarlo según reglas de ámbito.

**Acceptance Scenarios**:

1. **Given** documentos clasificados por oficio en la biblioteca del campus, **When** un agente de ese oficio trabaja, **Then** puede recuperar material de esas clasificaciones (mismo oficio en distintos edificios comparte el corpus).
2. **Given** un episodio recordado en la memoria del agente, **When** ese agente recall, **Then** obtiene su memoria personal.
3. **Given** un episodio recordado en la memoria del proyecto, **When** un agente del edificio recall con ámbito de proyecto, **Then** obtiene el contexto compartido del building.

---

### User Story 8 - Spec Kit por edificio (Priority: P3)

Como operador de un proyecto, activo Spec-Driven Development en el edificio y avanzo fases (constitution → specify → plan → tasks → implement → converge). Los agentes ejecutan órdenes ligadas a artefactos de esa especificación.

**Why this priority**: Principio constitucional; aporta gobernanza de intent, pero no bloquea mapa/org/chat mínimos.

**Independent Test**: Activar Spec Kit en un proyecto; registrar un artifact de specify; cambiar fase; ligar una orden/tarea a ese artifact.

**Acceptance Scenarios**:

1. **Given** un proyecto sin Spec Kit activo, **When** el operador lo activa, **Then** el proyecto tiene fase y contenedor de artefactos SDD.
2. **Given** Spec Kit activo, **When** se completa un paso de fase, **Then** la fase del proyecto se actualiza y queda auditable.
3. **Given** un artifact de tasks/implement, **When** se asigna trabajo a un agente, **Then** la orden/run queda referenciada al artifact.

---

### Edge Cases

- ¿Qué ocurre si el departamento natural del arquetipo no existe en el edificio? El agente permanece en la oficina de instanciación / sala de entrada hasta que exista home o se reasigne.
- ¿Qué ocurre si la oficina correspondiente no existe en el edificio de la llamada? El agente entra al edificio llamante en una ubicación por defecto (p. ej. hall) sin adoptar otra especialización de dpto.
- ¿Qué ocurre si cae la presencia viva de un agente? Deja de habitar la oficina como figura activa; las reglas de org/chat siguen aplicando sobre la instancia.
- ¿Qué ocurre al destruir un worker con chat u órdenes abiertas? Se cierran o se marcan abandonadas; la figura sale del mapa.
- ¿Qué ocurre si dos llamadas compiten por el mismo agente? Solo una llamada activa a la vez; nuevas llamadas se rechazan o encolan según política de una sola `activeCallId`.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST modelar Campus → Project (edificio) → Workspace (oficina/departamento) → AgentInstance.
- **FR-002**: El sistema MUST mantener un catálogo de arquetipos (oficio + departamento natural + rango por defecto) separado de las instancias nombradas en el mapa.
- **FR-003**: Los usuarios MUST poder instanciar un agente desde el catálogo con nombre propio, introducción a pares y homing al departamento natural cuando exista.
- **FR-004**: Los agentes MUST permanecer en su oficina home por defecto y MUST NOT desplazarse entre edificios sin una llamada de proyecto explícita aceptada.
- **FR-005**: Al aceptar una llamada, el agente MUST situarse en el edificio llamante y en la oficina correspondiente a su departamento natural si existe; al cerrar, MUST volver a home.
- **FR-006**: El razonamiento / etiqueta de oficio del agente MUST ser siempre el de su craft; visitar otra sala MUST NOT cambiar esa especialización de oficio.
- **FR-007**: El sistema MUST exponer tres superficies first-class: gamificación (mapa/presencia), organigrama/tareas, y chats con agentes.
- **FR-008**: El cliente principal MUST ofrecer la misma experiencia de producto en móvil, escritorio y web a partir de una sola aplicación de cliente (sin shells distintos para el mapa).
- **FR-009**: Las reglas de negocio (jerarquía, catálogo, memoria, llamadas, Spec Kit) MUST vivir fuera del cliente visual; el cliente MUST proyectar estado, no inventar reglas paralelas.
- **FR-010**: El debate MUST permitirse solo entre agentes del mismo rango; la comunicación/asignación MUST NOT saltar líneas de reporting.
- **FR-011**: Solo el supervisor directo MUST poder evaluar las tareas de un report.
- **FR-012**: Solo agentes del rango más bajo (`ic`) MUST poder crear y destruir workers anónimos; solo el creador MUST poder destruir los suyos; el mapa MUST mostrar entrada/salida del campus.
- **FR-013**: La biblioteca del campus MUST clasificar documentos por oficio (no por id de instancia); el mismo oficio en distintos edificios MUST compartir esas clasificaciones.
- **FR-014**: El sistema MUST soportar memoria episódica a nivel de agente y a nivel de proyecto (edificio), además del corpus documental de la biblioteca.
- **FR-015**: Cada proyecto MUST poder activar Spec-Driven Development con fases y artefactos; el trabajo de agentes MAY ligarse a esos artefactos.
- **FR-016**: El sistema MUST representar presencia viva vs offline de instancias (incluidos hosts remotos en el futuro) sin bloquear el MVP de pantallas.
- **FR-017**: Hosts CLI distribuidos MUST quedar fuera del alcance entregable del MVP de pantallas, aunque el modelo MAY reservar el contrato.
- **FR-018**: Plugins / conectores externos MUST integrarse en la capa de servicios del campus; el cliente visual MUST mostrar paneles, no ejecutar runtimes propietarios de plugins.

### Key Entities

- **Campus**: Contenedor del mundo; posee biblioteca y conjunto de proyectos.
- **Project (Building)**: Edificio con contexto organizacional, rangos, oficinas, memoria compartida y Spec Kit opcional.
- **Workspace (Office)**: Departamento/oficina dentro de un edificio; especialización y head opcional.
- **Skill / Craft**: Oficio genérico del catálogo; llave a la biblioteca.
- **AgentArchetype**: Plantilla de catálogo (oficio, dpto natural, rango/harness por defecto).
- **AgentInstance**: Agente nombrado (o worker anónimo) con home, rango, supervisor, oficio y presencia.
- **ProjectCall**: Autorización temporal para que un agente deje home y trabaje en otro edificio.
- **Library / DocClassification / LibraryDocument**: Corpus documental del campus ligado a oficios.
- **Memory (agent / project)**: Episodios verbatim por ámbito agente o edificio.
- **SpecKit state**: Fase SDD y artefactos por proyecto.
- **Debate / Task / Evaluation / Order**: Artefactos de ops sujetos a jerarquía.
- **Anonymous Worker**: Instancia sin ficha de catálogo propia, spawneada por `ic`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Un operador nuevo completa el recorrido “abrir campus → ver mapa → instanciar un agente → verlo en su oficina” en menos de 5 minutos con datos de muestra.
- **SC-002**: El 100% de los intentos de mover un agente entre edificios sin llamada activa son rechazados en pruebas de aceptación.
- **SC-003**: En una batería de casos org (debate mismo/distinto rango; evaluación supervisor vs no-supervisor), el 100% de las reglas de jerarquía se cumplen.
- **SC-004**: Un operador puede alternar entre las tres superficies (mapa, org, chat) sobre el mismo campus de muestra sin perder el contexto del proyecto activo.
- **SC-005**: Tras aceptar y cerrar una llamada entre dos edificios de muestra, el agente termina de nuevo en su oficina home en el 100% de las pruebas.
- **SC-006**: Al menos un flujo de Spec Kit (activar → registrar artifact → avanzar una fase) es demostrable de punta a punta en un proyecto de muestra.
- **SC-007**: Documentos de biblioteca ligados a un oficio son recuperables por instancias de ese oficio en dos edificios distintos del mismo campus.
- **SC-008**: El cliente principal del MVP se demuestra en al menos escritorio y una de: web o móvil, con las tres superficies usables.

## Assumptions

- El rango más bajo (`ic`) es quien spawnea/destruye workers anónimos (alineado con la constitución).
- Spec Kit es **opt-in por proyecto** (SHOULD), no obligatorio al crear un edificio.
- Los workers anónimos aparecen en el mapa; en org/chat se muestran de forma mínima (lista/presencia) sin ficha rica de catálogo.
- Cualquier agente del proyecto (o el operador humano) puede escribir en la memoria compartida del edificio; el recall respeta ámbitos agent/project/department.
- CLI hosts, admin React opcional y backends de comms alternativos quedan **fuera** del MVP entregable de pantallas.
- Auth de operadores usa el mecanismo estándar del despliegue (sesión u OAuth); no es el foco de esta especificación.
- Un solo campus de muestra basta para validar el MVP; multi-tenant / multi-campus avanzado es posterior.
- La dirección visual es “Stardew-like”; refs estéticas son orientativas, no bloquean la aceptación funcional.
