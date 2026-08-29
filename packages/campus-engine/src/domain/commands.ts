/**
 * Command contract (control plane authority). A `CampusCommand` is a *request*
 * that `execute` validates against the current state and either accepts (turning
 * it into a `CampusEvent` fact) or rejects with a typed reason. Pure, no I/O.
 */

import type {
  AgentInstance,
  Building,
  Campus,
  CampusEvent,
  DebateSession,
  DocClassification,
  Id,
  LibraryDocument,
  MemoryRecord,
  Project,
  Room,
  SpecKitArtifact,
  State,
  Task,
  TaskVerdict,
} from "./types";
import { WORKER_SPAWNER_RANK_KEY, LEADER_RANK_KEY, LEADER_ROOM_ROLE } from "./types";
import { canDebate } from "./org";
import { nextSpecKitPhase } from "./speckit";
import { liveRuntimeForAgent } from "./host";

/** Requests from a client/host to the core (validable, rejectable). */
export type CampusCommand =
  | { type: "campus.load"; campus: Campus }
  | {
      type: "building.spawn";
      building: Building;
      leaderRoomId?: Id;
      leaderRoomKey?: string;
      leaderAgentId?: Id;
      leaderName?: string;
    }
  | { type: "building.updateContext"; buildingId: Id; context: string }
  | { type: "building.assignLead"; buildingId: Id; agentId: Id }
  | { type: "room.spawn"; room: Room }
  | { type: "room.updateContext"; roomId: Id; context: string }
  | { type: "project.create"; project: Project }
  | { type: "project.archive"; projectId: Id }
  | { type: "project.assign"; agentId: Id; projectId: Id }
  | { type: "project.unassign"; agentId: Id; projectId: Id }
  | { type: "agent.instantiate"; agent: AgentInstance }
  | { type: "agent.assignSupervisor"; agentId: Id; supervisorId: Id | null }
  | { type: "room.assignHead"; roomId: Id; agentId: Id }
  | { type: "worker.spawn"; actorId: Id; worker: AgentInstance }
  | { type: "worker.despawn"; actorId: Id; workerId: Id }
  | { type: "task.assign"; task: Task }
  | { type: "task.start"; taskId: Id }
  | { type: "task.submit"; taskId: Id }
  | { type: "task.evaluate"; taskId: Id; evaluatorId: Id; verdict: TaskVerdict }
  | { type: "debate.open"; debate: DebateSession }
  | { type: "debate.close"; debateId: Id }
  | { type: "project.call"; id: Id; agentId: Id; toBuildingId: Id; toRoomId: Id }
  | { type: "project.returnHome"; agentId: Id }
  | { type: "memory.remember"; record: MemoryRecord }
  | { type: "speckit.enable"; buildingId: Id }
  | { type: "speckit.advancePhase"; buildingId: Id }
  | { type: "speckit.addArtifact"; artifact: SpecKitArtifact }
  | { type: "host.join"; id: Id; label: string }
  | { type: "host.leave"; hostId: Id }
  | { type: "runtime.start"; id: Id; hostId: Id; agentId: Id; workingDir?: string }
  | { type: "runtime.stop"; runtimeId: Id }
  | { type: "library.addClassification"; classification: DocClassification }
  | { type: "library.addDocument"; document: LibraryDocument };

export type RejectionReason =
  | "campus_already_loaded"
  | "campus_not_loaded"
  | "campus_mismatch"
  | "building_not_found"
  | "room_not_found_in_building"
  | "duplicate_id"
  | "agent_not_found"
  | "supervisor_not_found"
  | "self_supervision"
  | "room_not_found"
  | "agent_not_in_room"
  | "agent_not_in_building"
  | "project_not_found"
  | "project_not_in_building"
  | "already_assigned"
  | "not_assigned"
  | "actor_not_found"
  | "rank_not_allowed"
  | "worker_not_found"
  | "not_worker_spawner"
  | "assignee_not_found"
  | "task_not_found"
  | "invalid_transition"
  | "evaluator_not_found"
  | "not_supervisor"
  | "need_two_participants"
  | "participant_not_found"
  | "not_same_rank"
  | "debate_not_found"
  | "already_closed"
  | "already_on_call"
  | "not_on_call"
  | "speckit_already_enabled"
  | "speckit_not_enabled"
  | "no_next_phase"
  | "host_not_found"
  | "host_offline"
  | "agent_already_live"
  | "runtime_not_found"
  | "classification_not_found";

export type CommandResult =
  | { ok: true; event: CampusEvent }
  | { ok: false; reason: RejectionReason };

const accept = (event: CampusEvent): CommandResult => ({ ok: true, event });
const reject = (reason: RejectionReason): CommandResult => ({ ok: false, reason });

/** Validate a command against the state; return an accepted event or a rejection. */
export function execute(state: State, command: CampusCommand): CommandResult {
  switch (command.type) {
    case "campus.load": {
      if (state.campus && state.campus.id !== command.campus.id) {
        return reject("campus_already_loaded");
      }
      return accept({ type: "campus.loaded", campus: command.campus });
    }

    case "building.spawn": {
      const { building } = command;
      if (!state.campus) return reject("campus_not_loaded");
      if (building.campusId !== state.campus.id) return reject("campus_mismatch");
      if (state.buildings.some((b) => b.id === building.id)) {
        return reject("duplicate_id");
      }
      // Composite: every building (environment) gets a Leader office + a leader
      // agent, and the leader agent becomes the environment lead.
      const leaderRoomId = command.leaderRoomId ?? `${building.id}-leader`;
      const leaderAgentId = command.leaderAgentId ?? `${building.id}-leader-agent`;
      const leaderRoom: Room = {
        id: leaderRoomId,
        buildingId: building.id,
        key: command.leaderRoomKey ?? "leader",
        role: LEADER_ROOM_ROLE,
      };
      const leaderAgent: AgentInstance = {
        id: leaderAgentId,
        name: command.leaderName ?? "Leader",
        kind: "named",
        buildingId: building.id,
        roomId: leaderRoomId,
        rankKey: LEADER_RANK_KEY,
      };
      return accept({
        type: "building.spawned",
        building: { ...building, leaderAgentId },
        leaderRoom,
        leaderAgent,
      });
    }

    case "building.updateContext": {
      const { buildingId, context } = command;
      if (!state.buildings.some((b) => b.id === buildingId)) return reject("building_not_found");
      return accept({ type: "building.context.updated", buildingId, context });
    }

    case "building.assignLead": {
      const { buildingId, agentId } = command;
      if (!state.buildings.some((b) => b.id === buildingId)) return reject("building_not_found");
      const agent = state.agents.find((a) => a.id === agentId);
      if (!agent) return reject("agent_not_found");
      if (agent.buildingId !== buildingId) return reject("agent_not_in_building");
      return accept({ type: "building.lead.assigned", buildingId, agentId });
    }

    case "room.spawn": {
      const { room } = command;
      if (!state.buildings.some((b) => b.id === room.buildingId)) {
        return reject("building_not_found");
      }
      if (state.rooms.some((r) => r.id === room.id)) return reject("duplicate_id");
      return accept({ type: "room.spawned", room });
    }

    case "room.updateContext": {
      const { roomId, context } = command;
      if (!state.rooms.some((r) => r.id === roomId)) return reject("room_not_found");
      return accept({ type: "room.context.updated", roomId, context });
    }

    case "project.create": {
      const { project } = command;
      if (!state.buildings.some((b) => b.id === project.buildingId)) {
        return reject("building_not_found");
      }
      if (state.projects.some((p) => p.id === project.id)) return reject("duplicate_id");
      return accept({ type: "project.created", project: { ...project, status: "active" } });
    }

    case "project.archive": {
      const { projectId } = command;
      if (!state.projects.some((p) => p.id === projectId)) return reject("project_not_found");
      return accept({ type: "project.archived", projectId });
    }

    case "project.assign": {
      const { agentId, projectId } = command;
      const agent = state.agents.find((a) => a.id === agentId);
      if (!agent) return reject("agent_not_found");
      const project = state.projects.find((p) => p.id === projectId);
      if (!project) return reject("project_not_found");
      if (project.buildingId !== agent.buildingId) return reject("project_not_in_building");
      if (state.assignments.some((x) => x.agentId === agentId && x.projectId === projectId)) {
        return reject("already_assigned");
      }
      return accept({ type: "project.assigned", agentId, projectId });
    }

    case "project.unassign": {
      const { agentId, projectId } = command;
      if (!state.assignments.some((x) => x.agentId === agentId && x.projectId === projectId)) {
        return reject("not_assigned");
      }
      return accept({ type: "project.unassigned", agentId, projectId });
    }

    case "agent.instantiate": {
      const { agent } = command;
      if (!state.buildings.some((b) => b.id === agent.buildingId)) {
        return reject("building_not_found");
      }
      const roomOk = state.rooms.some(
        (r) => r.id === agent.roomId && r.buildingId === agent.buildingId,
      );
      if (!roomOk) return reject("room_not_found_in_building");
      if (state.agents.some((a) => a.id === agent.id)) return reject("duplicate_id");
      return accept({ type: "agent.instantiated", agent });
    }

    case "agent.assignSupervisor": {
      const { agentId, supervisorId } = command;
      if (!state.agents.some((a) => a.id === agentId)) return reject("agent_not_found");
      if (supervisorId !== null) {
        if (supervisorId === agentId) return reject("self_supervision");
        if (!state.agents.some((a) => a.id === supervisorId)) {
          return reject("supervisor_not_found");
        }
      }
      return accept({ type: "agent.supervisor.assigned", agentId, supervisorId });
    }

    case "room.assignHead": {
      const { roomId, agentId } = command;
      const room = state.rooms.find((r) => r.id === roomId);
      if (!room) return reject("room_not_found");
      const agent = state.agents.find((a) => a.id === agentId);
      if (!agent) return reject("agent_not_found");
      if (agent.roomId !== roomId) return reject("agent_not_in_room");
      return accept({ type: "room.head.assigned", roomId, agentId });
    }

    case "worker.spawn": {
      const { actorId, worker } = command;
      const actor = state.agents.find((a) => a.id === actorId);
      if (!actor) return reject("actor_not_found");
      if (actor.rankKey !== WORKER_SPAWNER_RANK_KEY) return reject("rank_not_allowed");
      if (!state.buildings.some((b) => b.id === worker.buildingId)) {
        return reject("building_not_found");
      }
      const roomOk = state.rooms.some(
        (r) => r.id === worker.roomId && r.buildingId === worker.buildingId,
      );
      if (!roomOk) return reject("room_not_found_in_building");
      const dup =
        state.workers.some((w) => w.id === worker.id) ||
        state.agents.some((a) => a.id === worker.id);
      if (dup) return reject("duplicate_id");
      return accept({ type: "worker.entered", worker: { ...worker, spawnedById: actorId } });
    }

    case "worker.despawn": {
      const { actorId, workerId } = command;
      const worker = state.workers.find((w) => w.id === workerId);
      if (!worker) return reject("worker_not_found");
      if (worker.spawnedById !== actorId) return reject("not_worker_spawner");
      return accept({ type: "worker.exited", workerId });
    }

    case "task.assign": {
      const { task } = command;
      if (!state.agents.some((a) => a.id === task.assigneeId)) {
        return reject("assignee_not_found");
      }
      if (state.tasks.some((t) => t.id === task.id)) return reject("duplicate_id");
      return accept({ type: "task.created", task: { ...task, status: "queued" } });
    }

    case "task.start": {
      const task = state.tasks.find((t) => t.id === command.taskId);
      if (!task) return reject("task_not_found");
      // Startable from queued or after a needed revision.
      if (task.status !== "queued" && task.status !== "needs_revision") {
        return reject("invalid_transition");
      }
      return accept({ type: "task.started", taskId: task.id });
    }

    case "task.submit": {
      const task = state.tasks.find((t) => t.id === command.taskId);
      if (!task) return reject("task_not_found");
      if (task.status !== "running") return reject("invalid_transition");
      return accept({ type: "task.submitted", taskId: task.id });
    }

    case "task.evaluate": {
      const { taskId, evaluatorId, verdict } = command;
      const task = state.tasks.find((t) => t.id === taskId);
      if (!task) return reject("task_not_found");
      if (task.status !== "under_review") return reject("invalid_transition");
      const evaluator = state.agents.find((a) => a.id === evaluatorId);
      if (!evaluator) return reject("evaluator_not_found");
      const assignee = state.agents.find((a) => a.id === task.assigneeId);
      // Constitución VI: only the direct supervisor evaluates.
      if (!assignee || assignee.supervisorId !== evaluatorId) {
        return reject("not_supervisor");
      }
      return accept({ type: "task.evaluated", taskId, evaluatorId, verdict });
    }

    case "debate.open": {
      const { debate } = command;
      if (debate.participantIds.length < 2) return reject("need_two_participants");
      if (state.debates.some((d) => d.id === debate.id)) return reject("duplicate_id");
      const participants: AgentInstance[] = [];
      for (const id of debate.participantIds) {
        const agent = state.agents.find((a) => a.id === id);
        if (!agent) return reject("participant_not_found");
        participants.push(agent);
      }
      // Debate requires all participants to share the same rank.
      const [first, ...rest] = participants;
      if (first && rest.some((p) => !canDebate(first, p))) {
        return reject("not_same_rank");
      }
      return accept({ type: "debate.opened", debate: { ...debate, status: "open" } });
    }

    case "debate.close": {
      const debate = state.debates.find((d) => d.id === command.debateId);
      if (!debate) return reject("debate_not_found");
      if (debate.status === "closed") return reject("already_closed");
      return accept({ type: "debate.closed", debateId: debate.id });
    }

    case "project.call": {
      const { id, agentId, toBuildingId, toRoomId } = command;
      const agent = state.agents.find((a) => a.id === agentId);
      if (!agent) return reject("agent_not_found");
      if (agent.activeCallId != null) return reject("already_on_call");
      if (state.calls.some((c) => c.id === id)) return reject("duplicate_id");
      if (!state.buildings.some((b) => b.id === toBuildingId)) {
        return reject("building_not_found");
      }
      const roomOk = state.rooms.some(
        (r) => r.id === toRoomId && r.buildingId === toBuildingId,
      );
      if (!roomOk) return reject("room_not_found_in_building");
      return accept({
        type: "project.call.issued",
        call: {
          id,
          agentId,
          toBuildingId,
          toRoomId,
          originBuildingId: agent.buildingId,
          originRoomId: agent.roomId,
          status: "open",
        },
      });
    }

    case "project.returnHome": {
      const { agentId } = command;
      const agent = state.agents.find((a) => a.id === agentId);
      if (!agent) return reject("agent_not_found");
      if (agent.activeCallId == null) return reject("not_on_call");
      return accept({ type: "project.call.closed", callId: agent.activeCallId, agentId });
    }

    case "memory.remember": {
      const { record } = command;
      if (state.memories.some((m) => m.id === record.id)) return reject("duplicate_id");
      if (record.scope === "agent") {
        if (!state.agents.some((a) => a.id === record.ownerId)) {
          return reject("agent_not_found");
        }
      } else {
        if (!state.buildings.some((b) => b.id === record.ownerId)) {
          return reject("building_not_found");
        }
      }
      return accept({ type: "memory.remembered", record });
    }

    case "speckit.enable": {
      const { buildingId } = command;
      if (!state.buildings.some((b) => b.id === buildingId)) {
        return reject("building_not_found");
      }
      if (state.specKits.some((s) => s.buildingId === buildingId)) {
        return reject("speckit_already_enabled");
      }
      return accept({ type: "speckit.enabled", buildingId, phase: "constitution" });
    }

    case "speckit.advancePhase": {
      const { buildingId } = command;
      const sk = state.specKits.find((s) => s.buildingId === buildingId);
      if (!sk) return reject("speckit_not_enabled");
      const next = nextSpecKitPhase(sk.phase);
      if (!next) return reject("no_next_phase");
      return accept({ type: "speckit.phase.changed", buildingId, phase: next });
    }

    case "speckit.addArtifact": {
      const { artifact } = command;
      if (!state.specKits.some((s) => s.buildingId === artifact.buildingId)) {
        return reject("speckit_not_enabled");
      }
      if (state.specArtifacts.some((a) => a.id === artifact.id)) {
        return reject("duplicate_id");
      }
      return accept({ type: "speckit.artifact.upserted", artifact });
    }

    case "host.join": {
      const { id, label } = command;
      if (state.hosts.some((h) => h.id === id)) return reject("duplicate_id");
      return accept({ type: "host.joined", host: { id, label, status: "online" } });
    }

    case "host.leave": {
      const { hostId } = command;
      if (!state.hosts.some((h) => h.id === hostId)) return reject("host_not_found");
      return accept({ type: "host.left", hostId });
    }

    case "runtime.start": {
      const { id, hostId, agentId, workingDir } = command;
      const host = state.hosts.find((h) => h.id === hostId);
      if (!host) return reject("host_not_found");
      if (host.status !== "online") return reject("host_offline");
      if (!state.agents.some((a) => a.id === agentId)) return reject("agent_not_found");
      if (liveRuntimeForAgent(state, agentId)) return reject("agent_already_live");
      if (state.runtimes.some((r) => r.id === id)) return reject("duplicate_id");
      const runtime =
        workingDir !== undefined
          ? { id, hostId, agentId, status: "running" as const, workingDir }
          : { id, hostId, agentId, status: "running" as const };
      return accept({ type: "runtime.started", runtime });
    }

    case "runtime.stop": {
      const { runtimeId } = command;
      const runtime = state.runtimes.find((r) => r.id === runtimeId);
      if (!runtime || runtime.status !== "running") return reject("runtime_not_found");
      return accept({ type: "runtime.stopped", runtimeId });
    }

    case "library.addClassification": {
      // Upsert semantics: add or replace by id.
      return accept({ type: "library.classification.upserted", classification: command.classification });
    }

    case "library.addDocument": {
      const { document } = command;
      for (const cid of document.classificationIds) {
        if (!state.classifications.some((c) => c.id === cid)) {
          return reject("classification_not_found");
        }
      }
      return accept({ type: "library.document.upserted", document });
    }
  }
}
