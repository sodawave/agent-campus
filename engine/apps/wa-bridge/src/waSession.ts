import { randomUUID } from "node:crypto";
import WebSocket from "ws";
import { deskPosition } from "./deskPosition";
import { isForbiddenForRoutines, pickWanderTarget, toWanderZone, zoneAt, type MapZoneId } from "./mapZones";
import type { SocialPhase } from "./proximity";
import type { AgentRef, WaBridgeConfig } from "./types";
import { encodeJoinRoomFrame, encodeSayFrame, encodeUserMovesFrame } from "./waProto";
import { resolveWaRoomUrl } from "./roomUrl";

export interface WaSession {
  readonly agentId: string;
  readonly name: string;
  readonly roomUrl: string;
  readonly desk: { x: number; y: number };
  position(): { x: number; y: number };
  zone(): MapZoneId;
  social(): SocialPhase;
  setSocial(phase: SocialPhase): void;
  moveTo(x: number, y: number, moving?: boolean): void;
  say(message: string): void;
  /**
   * Brief social hold (QUEUED). After `holdMs` (cfg.queueHoldMs), resumes wandering.
   */
  setQueued(queued: boolean, holdMs?: number): void;
  close(): void;
}

export interface JoinWaSessionOptions {
  onDisconnect?: () => void;
  startIdle?: boolean;
}

interface AnonymLoginResponse {
  authToken: string;
  userUuid: string;
}

async function anonymLogin(playUrl: string): Promise<AnonymLoginResponse> {
  const res = await fetch(new URL("/anonymLogin", playUrl), { method: "POST" });
  if (!res.ok) {
    throw new Error(`anonymLogin failed: HTTP ${res.status}`);
  }
  return (await res.json()) as AnonymLoginResponse;
}

function buildWsUrl(cfg: WaBridgeConfig, roomUrl: string): string {
  const base = new URL(cfg.waPlayUrl);
  base.protocol = base.protocol === "https:" ? "wss:" : "ws:";
  base.pathname = "/ws/room";
  base.search = "";
  const params = base.searchParams;
  params.set("roomId", roomUrl);
  for (const id of cfg.characterTextureIds) {
    params.append("characterTextureIds", id);
  }
  params.set("version", "dev");
  params.set("chatID", "");
  params.set("roomName", "");
  params.set("cameraState", "false");
  params.set("microphoneState", "false");
  params.set("screenSharingState", "false");
  params.set("tabId", randomUUID());
  return base.toString();
}

export async function joinWaSession(
  agent: AgentRef,
  cfg: WaBridgeConfig,
  options: JoinWaSessionOptions = {},
): Promise<WaSession> {
  const { authToken } = await anonymLogin(cfg.waPlayUrl);
  const roomUrl = resolveWaRoomUrl(agent, cfg.waRoomUrl);
  const wsUrl = buildWsUrl(cfg, roomUrl);
  const desk = deskPosition(agent, cfg.joinPosition);

  const ws = await new Promise<WebSocket>((resolve, reject) => {
    const socket = new WebSocket(wsUrl, [authToken]);
    socket.binaryType = "nodebuffer";

    const onError = (err: Error) => {
      cleanup();
      reject(err);
    };
    const onOpen = () => {
      cleanup();
      resolve(socket);
    };
    const onClose = (code: number, reason: Buffer) => {
      cleanup();
      reject(new Error(`WA socket closed before open: ${code} ${reason.toString()}`));
    };
    const cleanup = () => {
      socket.off("open", onOpen);
      socket.off("error", onError);
      socket.off("close", onClose);
    };
    socket.on("open", onOpen);
    socket.on("error", onError);
    socket.on("close", onClose);
  });

  let nonce = 1;
  let pos = { ...desk };
  let socialPhase: SocialPhase = "alone";
  let holdUntil = 0;
  let queueHoldTimer: ReturnType<typeof setTimeout> | undefined;

  const sendFrame = (bytes: Uint8Array) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(bytes);
  };

  const inHold = () => Date.now() < holdUntil;

  sendFrame(
    encodeJoinRoomFrame({
      name: agent.name,
      x: desk.x,
      y: desk.y,
      nonce: nonce++,
    }),
  );

  const moveTo = (x: number, y: number, moving = false) => {
    // During hold, allow only non-moving micro-adjustments (face-to-face seat).
    if (inHold() && moving) return;
    pos = { x, y };
    // If somehow inside jitsi, nudge toward desk next frame via idle.
    sendFrame(encodeUserMovesFrame({ x, y, moving, nonce: nonce++ }));
  };

  const say = (message: string) => {
    sendFrame(encodeSayFrame({ message, nonce: nonce++ }));
  };

  setTimeout(() => moveTo(desk.x, desk.y, false), 250);

  let closedByUs = false;
  const timers: ReturnType<typeof setInterval>[] = [];

  const ping = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.ping();
      } catch {
        /* ignore */
      }
    }
  }, 15_000);
  timers.push(ping);

  const startIdle = options.startIdle ?? cfg.routinesEnabled;
  if (startIdle && cfg.routineIdleMs > 0) {
    const idle = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN || inHold()) return;

      // Escape forbidden layers (Jitsi + human spawn) — never linger there.
      if (isForbiddenForRoutines(zoneAt(pos.x, pos.y))) {
        moveTo(desk.x, desk.y, true);
        return;
      }

      const target = pickWanderTarget(desk, pos);
      moveTo(target.x, target.y, true);
      // Sometimes stay at the new spot; sometimes return toward desk later.
      if (target.zone !== "desk" && Math.random() < 0.45) {
        setTimeout(() => {
          if (!inHold() && ws.readyState === WebSocket.OPEN) {
            moveTo(desk.x, desk.y, true);
          }
        }, 8_000);
      }
    }, cfg.routineIdleMs);
    timers.push(idle);
  }

  ws.on("close", () => {
    for (const t of timers) clearInterval(t);
    if (queueHoldTimer) clearTimeout(queueHoldTimer);
    if (!closedByUs) options.onDisconnect?.();
  });
  ws.on("error", (err) => {
    console.error(`[wa-bridge] session error for ${agent.id}:`, err.message);
  });

  console.info(`[wa-bridge] joined WA as "${agent.name}" (${agent.id}) @ ${desk.x},${desk.y} room=${roomUrl}`);

  return {
    agentId: agent.id,
    name: agent.name,
    roomUrl,
    desk,
    position: () => ({ ...pos }),
    zone: () => toWanderZone(zoneAt(pos.x, pos.y)),
    social: () => socialPhase,
    setSocial(phase) {
      socialPhase = phase;
    },
    moveTo,
    say,
    setQueued(value, holdMs = cfg.queueHoldMs) {
      if (queueHoldTimer) clearTimeout(queueHoldTimer);
      if (!value) {
        holdUntil = 0;
        socialPhase = "alone";
        return;
      }
      socialPhase = "queued";
      holdUntil = Date.now() + holdMs;
      queueHoldTimer = setTimeout(() => {
        holdUntil = 0;
        socialPhase = "alone";
        console.info(`[wa-bridge] ${agent.id} queue hold ended — resuming walk`);
      }, holdMs);
    },
    close() {
      closedByUs = true;
      for (const t of timers) clearInterval(t);
      if (queueHoldTimer) clearTimeout(queueHoldTimer);
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1000, "bridge stop");
      }
    },
  };
}
