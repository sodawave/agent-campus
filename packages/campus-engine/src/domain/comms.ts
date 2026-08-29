/**
 * Agent communication bus — deploy-facing contract.
 *
 * Ops pattern inspired by block/buzz (relay + postgres + redis + s3 compose).
 * Default backend is an internal WS/Redis bus carrying CampusEvent.
 * Optional: plug a Buzz-compatible relay for signed human/agent rooms.
 *
 * @see https://github.com/block/buzz/tree/main/deploy/compose
 */

import type { CampusEvent, Id } from "./types";

export type CommsBackendKind = "internal" | "buzz";

export interface CommsConfig {
  backend: CommsBackendKind;
  /** Redis URL for fan-out when backend=internal. */
  redisUrl?: string;
  /** Buzz / Nostr relay WebSocket when backend=buzz. */
  buzzRelayUrl?: string;
}

export const DEFAULT_COMMS_CONFIG: CommsConfig = {
  backend: "internal",
};

/** Channel scopes for pub/sub (map to Redis keys / Buzz rooms later). */
export type CommsChannel =
  | { scope: "campus"; campusId: Id }
  | { scope: "project"; projectId: Id }
  | { scope: "workspace"; workspaceId: Id }
  | { scope: "agent"; agentId: Id }
  | { scope: "thread"; threadId: Id };

export function channelKey(ch: CommsChannel): string {
  switch (ch.scope) {
    case "campus":
      return `campus:${ch.campusId}`;
    case "project":
      return `project:${ch.projectId}`;
    case "workspace":
      return `workspace:${ch.workspaceId}`;
    case "agent":
      return `agent:${ch.agentId}`;
    case "thread":
      return `thread:${ch.threadId}`;
  }
}

/**
 * Port implemented by API runtime.
 * Harnesses publish; UIs and peer agents subscribe.
 */
export interface AgentCommsPort {
  publish(channel: CommsChannel, event: CampusEvent): Promise<void>;
  subscribe(
    channel: CommsChannel,
    handler: (event: CampusEvent) => void,
  ): () => void;
}
