import {
  CampusStore,
  sampleDataset,
  type AgentInstance,
  type BuildingLayout,
} from "@agent-campus/campus-engine";

export type ChatMessage = { who: "me" | "agent"; text: string };

export interface UiState {
  screen: "gamification" | "org_tasks" | "chats";
  /** Selected "actor" on the gamification screen (worker spawner). */
  actorId: string | null;
  /** Selected agent on the chats screen. */
  chatAgentId: string | null;
  chats: Map<string, ChatMessage[]>;
}

export const store = new CampusStore();
export const building: BuildingLayout = sampleDataset.building;

export const ui: UiState = {
  screen: "gamification",
  actorId: null,
  chatAgentId: null,
  chats: new Map(),
};

type Cb = () => void;
const listeners = new Set<Cb>();

export function onChange(cb: Cb): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function notify(): void {
  for (const cb of listeners) cb();
}

// Re-render whenever the store changes.
store.subscribe(() => notify());

/** Load the demo campus and seed a small, believable org. */
export function bootstrap(): void {
  store.loadProject({
    project: sampleDataset.project,
    workspaces: sampleDataset.workspaces,
    catalog: sampleDataset.catalog,
    library: sampleDataset.library,
    classifications: sampleDataset.classifications,
    documents: sampleDataset.documents,
  });

  // Engineering department: head + a senior report.
  const nadia = store.instantiateAgent({
    projectId: sampleDataset.project.id,
    archetypeId: "arch-dept-head",
    name: "Nadia Ortiz",
  });
  store.assignHead("ws-dev", nadia.id);

  const ada = store.instantiateAgent({
    projectId: sampleDataset.project.id,
    archetypeId: "arch-systems-eng",
    name: "Ada Rivera",
  });

  // Marketing: an ic marketer (can spawn anonymous workers).
  const mia = store.instantiateAgent({
    projectId: sampleDataset.project.id,
    archetypeId: "arch-marketer",
    name: "Mia Chen",
  });

  // Settle introductions.
  for (const a of store.namedAgents()) store.completeIntroduction(a.id);

  // Seed a couple of tasks so the ops screen is populated.
  store.addTask({ agentId: ada.id, title: "Wire CampusStore events", status: "running" });
  store.addTask({ agentId: ada.id, title: "A* pathing on collision layer", status: "queued" });
  store.issueOrder({
    toAgentId: mia.id,
    fromActorId: nadia.id,
    fromKind: "agent",
    instruction: "Draft the launch announcement",
  });

  // Default selections.
  ui.actorId = mia.id; // ic marketer → can spawn workers
  ui.chatAgentId = ada.id;
}

export function pickDefaultActor(): AgentInstance | null {
  const agents = store.namedAgents();
  const current = ui.actorId
    ? agents.find((a) => a.id === ui.actorId)
    : undefined;
  if (current) return current;
  return agents[0] ?? null;
}
