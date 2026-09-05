/** Minimal agent projection needed by the WA bridge. */
export interface AgentAppearance {
  skinKey?: string;
  x?: number;
  y?: number;
  facing?: "up" | "down" | "left" | "right";
}

export interface AgentRef {
  id: string;
  name: string;
  kind: "named" | "anonymous_worker";
  buildingId: string;
  roomId: string;
  skillKey?: string;
  appearance?: AgentAppearance;
}

export interface WaBridgeConfig {
  campusWsUrl: string;
  waPlayUrl: string;
  waRoomUrl: string;
  characterTextureIds: string[];
  joinPosition: { x: number; y: number };
  reconnectBaseMs: number;
  reconnectMaxMs: number;
  routinesEnabled: boolean;
  routineIdleMs: number;
  routineWorkMs: number;
  /** How long QUEUED freezes wander before resume (ms). */
  queueHoldMs: number;
}
