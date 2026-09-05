export type WorkPhase = "idle" | "working" | "break" | "queued";

const PHASE_ORDER: WorkPhase[] = ["idle", "working", "break"];

export function nextWorkPhase(current: WorkPhase): WorkPhase {
  if (current === "queued") return "queued";
  const i = PHASE_ORDER.indexOf(current);
  return PHASE_ORDER[(i + 1) % PHASE_ORDER.length] ?? "idle";
}

const BY_SKILL: Record<string, Record<Exclude<WorkPhase, "queued">, string>> = {
  "software-eng": {
    idle: "{name}: revisando el backlog de engineering.",
    working: "{name}: abro un PR y paso tests en verde.",
    break: "{name}: café corto; vuelvo al código.",
  },
  marketing: {
    idle: "{name}: miro métricas de lanzamiento.",
    working: "{name}: redacto el copy de la campaña.",
    break: "{name}: pauso y reviso el calendario.",
  },
  operations: {
    idle: "{name}: chequeo el estado de ops.",
    working: "{name}: cierro un ticket de operaciones.",
    break: "{name}: respiro; luego retomo el runbook.",
  },
  finance: {
    idle: "{name}: reviso el forecast.",
    working: "{name}: cuadre de números en curso.",
    break: "{name}: pausa; vuelvo a las cifras.",
  },
  research: {
    idle: "{name}: leo notas del lab.",
    working: "{name}: experimento en marcha.",
    break: "{name}: descanso; luego más research.",
  },
};

const FALLBACK: Record<Exclude<WorkPhase, "queued">, string> = {
  idle: "{name}: en el escritorio, a la espera.",
  working: "{name}: avanzando en su oficio.",
  break: "{name}: breve pausa.",
};

const QUEUED_TEXT = "{name}: QUEUED — a la espera de órdenes.";

export function workChatText(name: string, skillKey: string | undefined, phase: WorkPhase): string {
  if (phase === "queued") return QUEUED_TEXT.replaceAll("{name}", name);
  const table = (skillKey && BY_SKILL[skillKey]) || FALLBACK;
  const template = table[phase] ?? FALLBACK[phase];
  return template.replaceAll("{name}", name);
}
