import type { WaBridgeConfig } from "./types";

export function loadConfig(env: NodeJS.ProcessEnv = process.env): WaBridgeConfig {
  const waPlayUrl = env.WA_PLAY_URL ?? "http://play.workadventure.localhost";
  const defaultRoom = `${waPlayUrl}/~/campus/starter/map.wam`;
  const routinesFlag = (env.WA_ROUTINES ?? "1").trim();
  return {
    campusWsUrl: env.CAMPUS_WS_URL ?? "ws://127.0.0.1:8787",
    waPlayUrl,
    waRoomUrl: env.WA_ROOM_URL ?? defaultRoom,
    characterTextureIds: (env.WA_CHARACTER_TEXTURE_IDS ?? "male1")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    joinPosition: {
      x: Number(env.WA_JOIN_X ?? 320),
      y: Number(env.WA_JOIN_Y ?? 320),
    },
    reconnectBaseMs: Number(env.WA_RECONNECT_BASE_MS ?? 1000),
    reconnectMaxMs: Number(env.WA_RECONNECT_MAX_MS ?? 30_000),
    routinesEnabled: routinesFlag !== "0" && routinesFlag.toLowerCase() !== "false",
    routineIdleMs: Number(env.WA_ROUTINE_IDLE_MS ?? 20_000),
    routineWorkMs: Number(env.WA_ROUTINE_WORK_MS ?? 90_000),
    queueHoldMs: Number(env.WA_QUEUE_HOLD_MS ?? 20_000),
  };
}
