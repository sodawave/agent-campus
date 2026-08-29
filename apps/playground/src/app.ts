import {
  CampusStore,
  sampleDataset,
  type AgentInstance,
  type BuildingLayout,
  type Project,
} from "@agent-campus/campus-engine";

export type ChatMessage = { who: "me" | "agent"; text: string };

export interface UiState {
  screen: "gamification" | "org_tasks" | "chats";
  /** Building whose interior is currently shown on the campus map. */
  activeBuildingId: string | null;
  /** Selected "actor" on the gamification screen (worker spawner). */
  actorId: string | null;
  /** Selected agent on the chats screen. */
  chatAgentId: string | null;
  chats: Map<string, ChatMessage[]>;
}

export const store = new CampusStore();
/** Shared building geometry for the map (all demo buildings reuse it). */
export const building: BuildingLayout = sampleDataset.building;

export const ui: UiState = {
  screen: "gamification",
  activeBuildingId: null,
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

export function activeBuilding(): Project | undefined {
  const id = ui.activeBuildingId;
  return (id ? store.getBuilding(id) : undefined) ?? store.firstBuilding();
}

/** Load the demo campus and seed a small, believable multi-building org. */
export function bootstrap(): void {
  store.campus.load({
    campus: sampleDataset.campus,
    project: sampleDataset.project,
    workspaces: sampleDataset.workspaces,
    catalog: sampleDataset.catalog,
    library: sampleDataset.library,
    classifications: sampleDataset.classifications,
    documents: sampleDataset.documents,
  });

  const demoId = sampleDataset.project.id;

  // Engineering department: head + a senior report.
  const nadia = store.agent.spawn({
    projectId: demoId,
    archetypeId: "arch-dept-head",
    name: "Nadia Ortiz",
  });
  store.room.assignHead("ws-dev", nadia.id);

  const ada = store.agent.spawn({
    projectId: demoId,
    archetypeId: "arch-systems-eng",
    name: "Ada Rivera",
  });

  // Marketing: an ic marketer (can spawn anonymous workers).
  const mia = store.agent.spawn({
    projectId: demoId,
    archetypeId: "arch-marketer",
    name: "Mia Chen",
  });

  // Second building on the campus, with a matching Engineering office so a
  // dev agent can be loaned there (ProjectCall) without being duplicated.
  const beta = store.building.spawn({
    name: "Beta Labs",
    context: {
      product: "Beta",
      mission: "Skunkworks / R&D del campus",
      brand: "Experimental, rápido",
    },
  });
  store.room.spawn({
    buildingId: beta.id,
    key: "dev",
    name: "Engineering",
    roomId: "room-ops",
    themeColor: "#2980b9",
    role: "ops",
    context: { title: "Engineering", specialization: "Prototipos R&D" },
  });
  store.room.spawn({
    buildingId: beta.id,
    key: "mkt",
    name: "Growth",
    roomId: "room-briefing",
    themeColor: "#c0392b",
    role: "briefing",
    context: { title: "Growth", specialization: "Lanzamientos beta" },
  });

  // Settle introductions.
  for (const a of store.namedAgents()) store.agent.introduce(a.id);

  // Seed a couple of tasks so the ops screen is populated.
  store.agent.addTask({
    agentId: ada.id,
    title: "Wire CampusStore events",
    status: "running",
  });
  store.agent.addTask({
    agentId: ada.id,
    title: "A* pathing on collision layer",
    status: "queued",
  });
  store.agent.order({
    toAgentId: mia.id,
    fromActorId: nadia.id,
    fromKind: "agent",
    instruction: "Draft the launch announcement",
  });

  // Default selections.
  ui.activeBuildingId = demoId;
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
