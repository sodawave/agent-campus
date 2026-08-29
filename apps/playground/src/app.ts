import {
  CampusStore,
  CampusCore,
  InMemoryCommsBus,
  CampusServer,
  CampusClient,
  sampleDataset,
  type AgentInstance,
  type BuildingLayout,
  type CampusCommand,
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

/** Shared building geometry for the map (all demo buildings reuse it). */
export const building: BuildingLayout = sampleDataset.building;

export const ui: UiState = {
  screen: "gamification",
  activeBuildingId: null,
  actorId: null,
  chatAgentId: null,
  chats: new Map(),
};

/**
 * The read model: the CLIENT's projection of the core (read-only).
 * Assigned in {@link bootstrap}; screens read via this and NEVER mutate it —
 * all mutations go through {@link send} as Commands to the core.
 */
export let store: CampusStore;
let client: CampusClient;

/** Send a Command to the core (fire-and-forget; projection updates + notifies). */
export function send(command: CampusCommand): void {
  void client.send(command);
}

type Cb = () => void;
const listeners = new Set<Cb>();

export function onChange(cb: Cb): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function notify(): void {
  for (const cb of listeners) cb();
}

export function activeBuilding(): Project | undefined {
  const id = ui.activeBuildingId;
  return (id ? store.getBuilding(id) : undefined) ?? store.firstBuilding();
}

/**
 * Load + seed the demo campus on the CORE, then expose the client projection.
 * Seeding (setup) uses the core's store directly; runtime user interactions go
 * through Commands (see {@link send}) — demonstrating the three planes.
 */
export function bootstrap(): void {
  const seed = new CampusStore();
  seed.campus.load({
    campus: sampleDataset.campus,
    project: sampleDataset.project,
    workspaces: sampleDataset.workspaces,
    catalog: sampleDataset.catalog,
    library: sampleDataset.library,
    classifications: sampleDataset.classifications,
    documents: sampleDataset.documents,
  });

  const demoId = sampleDataset.project.id;

  const nadia = seed.agent.spawn({
    projectId: demoId,
    archetypeId: "arch-dept-head",
    name: "Nadia Ortiz",
  });
  seed.room.assignHead("ws-dev", nadia.id);

  const ada = seed.agent.spawn({
    projectId: demoId,
    archetypeId: "arch-systems-eng",
    name: "Ada Rivera",
  });

  const mia = seed.agent.spawn({
    projectId: demoId,
    archetypeId: "arch-marketer",
    name: "Mia Chen",
  });

  // Second building with a matching Engineering office (loan target).
  const beta = seed.building.spawn({
    name: "Beta Labs",
    context: {
      product: "Beta",
      mission: "Skunkworks / R&D del campus",
      brand: "Experimental, rápido",
    },
  });
  seed.room.spawn({
    buildingId: beta.id,
    key: "dev",
    name: "Engineering",
    roomId: "room-ops",
    themeColor: "#2980b9",
    role: "ops",
    context: { title: "Engineering", specialization: "Prototipos R&D" },
  });
  seed.room.spawn({
    buildingId: beta.id,
    key: "mkt",
    name: "Growth",
    roomId: "room-briefing",
    themeColor: "#c0392b",
    role: "briefing",
    context: { title: "Growth", specialization: "Lanzamientos beta" },
  });

  for (const a of seed.namedAgents()) seed.agent.introduce(a.id);

  seed.agent.addTask({
    agentId: ada.id,
    title: "Wire CampusStore events",
    status: "running",
  });
  seed.agent.addTask({
    agentId: ada.id,
    title: "A* pathing on collision layer",
    status: "queued",
  });
  seed.agent.order({
    toAgentId: mia.id,
    fromActorId: nadia.id,
    fromKind: "agent",
    instruction: "Draft the launch announcement",
  });

  seed.building.specKit.enable(demoId);
  seed.building.specKit.advancePhase(demoId); // → specify
  seed.building.specKit.addArtifact({
    buildingId: demoId,
    kind: "constitution",
    title: "Campus constitution",
    uri: "specs/constitution.md",
    authorAgentId: nadia.id,
  });
  seed.building.specKit.addArtifact({
    buildingId: demoId,
    kind: "spec",
    title: "Agent Campus MVP spec",
    uri: "specs/mvp/spec.md",
    authorAgentId: ada.id,
  });

  const laptop = seed.host.join({ label: "laptop-ana" });
  seed.host.spawnRuntime({
    hostId: laptop.id,
    agentId: ada.id,
    workingDir: "/home/ana/agent-campus",
  });

  // --- Wrap the seeded core and expose the client projection ---
  const core = new CampusCore(seed);
  const bus = new InMemoryCommsBus();
  const server = new CampusServer(core, bus);
  client = new CampusClient(bus, (json) => server.submit(json));
  client.replay(server.log()); // catch up to the seeded snapshot
  client.subscribe(() => notify()); // re-render on projected changes
  store = client.read();

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
