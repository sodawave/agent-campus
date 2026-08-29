/**
 * Distributed agent host CLI — run agents on any machine, join the campus.
 *
 * Install: `npm i -g @agent-campus/cli` (name TBD) → `campus` binary.
 * The host process keeps agents alive, connects to the campus API/WS bus,
 * and the gamification layer represents each instance in its office/role.
 *
 * Inspired in spirit by buzz-cli (agent-first JSON I/O) but campus-native.
 */

import type { AgentInstance, HarnessParams, Id } from "./types";

/** A machine/process that can run one or more agent runtimes. */
export interface AgentHost {
  id: Id;
  /** Human label for the machine (hostname, "laptop-ana", "gpu-box-1"). */
  label: string;
  /** Stable machine fingerprint if available. */
  machineId?: string;
  /** Roles this host is allowed / configured to run. */
  allowedRankKeys?: string[];
  allowedSkillKeys?: string[];
  /** Campus API base the host is joined to. */
  campusUrl: string;
  status: "online" | "offline" | "draining";
  lastSeenAt: string;
  version?: string;
}

/**
 * Live runtime of one AgentInstance on a host.
 * Maps 1:1 to a sprite representation on the campus map.
 */
export interface AgentRuntime {
  id: Id;
  hostId: Id;
  agentId: Id;
  projectId: Id;
  /** Role/rank this runtime assumed when started. */
  rankKey: string;
  skillKey: string;
  harness: HarnessParams;
  status: "starting" | "running" | "paused" | "stopping" | "dead";
  startedAt: string;
  /**
   * Host-local working directory that feeds this runtime (files/tools it may
   * access). Metadata/manifest only — the core never owns the bytes.
   */
  workingDir?: string;
}

/** CLI join payload — host announces itself to campus. */
export interface HostJoinRequest {
  label: string;
  machineId?: string;
  allowedRankKeys?: string[];
  allowedSkillKeys?: string[];
  version?: string;
  /** Auth token / device credential. */
  token: string;
}

/** Instantiate (or attach) an agent on this host and represent it on campus. */
export interface HostSpawnRequest {
  hostId: Id;
  /** Catalog archetype to instantiate, or existing agentId to revive. */
  archetypeId?: Id;
  agentId?: Id;
  name?: string;
  projectId: Id;
  rankKey?: string;
  harness?: Partial<HarnessParams>;
  /** If true, stay in spawn room; else home to natural office. */
  stayInRoom?: boolean;
  /** Host-local working directory the runtime is allowed to use. */
  workingDir?: string;
}

export interface CampusCliPort {
  hostJoin(req: HostJoinRequest): Promise<AgentHost>;
  hostHeartbeat(hostId: Id): Promise<void>;
  hostLeave(hostId: Id): Promise<void>;
  spawn(req: HostSpawnRequest): Promise<AgentRuntime>;
  stop(runtimeId: Id): Promise<void>;
  listRuntimes(hostId: Id): Promise<AgentRuntime[]>;
}

/** Build a host record from a join payload (pure). */
export function buildAgentHost(input: {
  id: Id;
  label: string;
  campusUrl?: string;
  machineId?: string;
  allowedRankKeys?: string[];
  allowedSkillKeys?: string[];
  version?: string;
  now?: string;
}): AgentHost {
  return {
    id: input.id,
    label: input.label,
    machineId: input.machineId,
    allowedRankKeys: input.allowedRankKeys,
    allowedSkillKeys: input.allowedSkillKeys,
    campusUrl: input.campusUrl ?? "local://campus",
    status: "online",
    lastSeenAt: input.now ?? new Date().toISOString(),
    version: input.version,
  };
}

/** Build a live runtime for an agent on a host (pure). */
export function buildAgentRuntime(input: {
  id: Id;
  host: AgentHost;
  agent: AgentInstance;
  workingDir?: string;
  now?: string;
}): AgentRuntime {
  return {
    id: input.id,
    hostId: input.host.id,
    agentId: input.agent.id,
    projectId: input.agent.projectId,
    rankKey: input.agent.rankKey,
    skillKey: input.agent.skill.key,
    harness: input.agent.harness,
    status: "running",
    startedAt: input.now ?? new Date().toISOString(),
    workingDir: input.workingDir,
  };
}

/** Suggested CLI surface (documented; implementation later). */
export const CAMPUS_CLI_COMMANDS = [
  "campus login --url <campus> --token <…>",
  "campus host join --label <name>",
  "campus host status",
  "campus agent spawn --archetype <id> --name <n> --project <id> [--rank ic]",
  "campus agent list",
  "campus agent stop <agentId|runtimeId>",
  "campus agent attach <agentId>",
  "campus logs <agentId> -f",
] as const;
