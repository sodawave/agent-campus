/**
 * Minimal protobuf wire encoder for WorkAdventure JoinRoom frames.
 * Only the fields the bridge needs — no dependency on @workadventure/messages.
 */

function encodeVarint(value: number): number[] {
  const out: number[] = [];
  let v = value >>> 0;
  while (v >= 0x80) {
    out.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  out.push(v);
  return out;
}

function tag(fieldNumber: number, wireType: number): number[] {
  return encodeVarint((fieldNumber << 3) | wireType);
}

function encodeBytes(fieldNumber: number, bytes: Uint8Array): Uint8Array {
  return Uint8Array.from([...tag(fieldNumber, 2), ...encodeVarint(bytes.length), ...bytes]);
}

function encodeString(fieldNumber: number, value: string): Uint8Array {
  return encodeBytes(fieldNumber, new TextEncoder().encode(value));
}

function encodeInt32Plain(fieldNumber: number, value: number): Uint8Array {
  return Uint8Array.from([...tag(fieldNumber, 0), ...encodeVarint(value | 0)]);
}

function encodeBool(fieldNumber: number, value: boolean): Uint8Array {
  return Uint8Array.from([...tag(fieldNumber, 0), value ? 1 : 0]);
}

function encodeEnum(fieldNumber: number, value: number): Uint8Array {
  return Uint8Array.from([...tag(fieldNumber, 0), ...encodeVarint(value)]);
}

function concat(...chunks: Uint8Array[]): Uint8Array {
  const len = chunks.reduce((n, c) => n + c.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

/** AvailabilityStatus.ONLINE */
export const AVAILABILITY_ONLINE = 1;
/** PositionMessage.Direction.DOWN */
export const DIRECTION_DOWN = 2;

export interface JoinRoomPayload {
  name: string;
  x: number;
  y: number;
  direction?: number;
  moving?: boolean;
  viewport?: { left: number; top: number; right: number; bottom: number };
  availabilityStatus?: number;
  nonce?: number;
}

function encodePosition(x: number, y: number, direction: number, moving: boolean): Uint8Array {
  return concat(
    encodeInt32Plain(1, x),
    encodeInt32Plain(2, y),
    encodeEnum(3, direction),
    encodeBool(4, moving),
  );
}

function encodeViewport(v: { left: number; top: number; right: number; bottom: number }): Uint8Array {
  return concat(
    encodeInt32Plain(1, v.left),
    encodeInt32Plain(2, v.top),
    encodeInt32Plain(3, v.right),
    encodeInt32Plain(4, v.bottom),
  );
}

function encodeJoinRoomFrontMessage(p: JoinRoomPayload): Uint8Array {
  const viewport = p.viewport ?? {
    left: p.x - 400,
    top: p.y - 300,
    right: p.x + 400,
    bottom: p.y + 300,
  };
  return concat(
    encodeBytes(1, encodePosition(p.x, p.y, p.direction ?? DIRECTION_DOWN, p.moving ?? false)),
    encodeBytes(2, encodeViewport(viewport)),
    encodeString(3, p.name),
    encodeEnum(6, p.availabilityStatus ?? AVAILABILITY_ONLINE),
  );
}

function encodeClientToServerJoin(join: Uint8Array): Uint8Array {
  return encodeBytes(1, join);
}

function encodeUserMovesMessage(p: { x: number; y: number; direction?: number; moving?: boolean }): Uint8Array {
  const viewport = {
    left: p.x - 400,
    top: p.y - 300,
    right: p.x + 400,
    bottom: p.y + 300,
  };
  return concat(
    encodeBytes(1, encodePosition(p.x, p.y, p.direction ?? DIRECTION_DOWN, p.moving ?? false)),
    encodeBytes(2, encodeViewport(viewport)),
  );
}

/** FrontToPusherWebSocketMessage { nonce, message: ClientToServerMessage } */
export function encodeJoinRoomFrame(payload: JoinRoomPayload): Uint8Array {
  const join = encodeJoinRoomFrontMessage(payload);
  const clientMsg = encodeClientToServerJoin(join);
  return concat(
    Uint8Array.from([...tag(1, 0), ...encodeVarint(payload.nonce ?? 1)]),
    encodeBytes(2, clientMsg),
  );
}

export interface UserMovesPayload {
  x: number;
  y: number;
  direction?: number;
  moving?: boolean;
  nonce?: number;
}

/** ClientToServerMessage.userMovesMessage = field 2 */
export function encodeUserMovesFrame(payload: UserMovesPayload): Uint8Array {
  const moves = encodeUserMovesMessage(payload);
  const clientMsg = encodeBytes(2, moves);
  return concat(
    Uint8Array.from([...tag(1, 0), ...encodeVarint(payload.nonce ?? 1)]),
    encodeBytes(2, clientMsg),
  );
}

/** SayMessageType.SpeechBubble */
export const SAY_SPEECH_BUBBLE = 0;

export interface SayPayload {
  message: string;
  nonce?: number;
}

function encodeSayMessage(message: string): Uint8Array {
  return concat(encodeString(1, message), encodeEnum(2, SAY_SPEECH_BUBBLE));
}

function encodeSetPlayerDetailsSay(message: string): Uint8Array {
  return encodeBytes(9, encodeSayMessage(message));
}

/** ClientToServerMessage.setPlayerDetailsMessage = field 6 */
export function encodeSayFrame(payload: SayPayload): Uint8Array {
  const details = encodeSetPlayerDetailsSay(payload.message);
  const clientMsg = encodeBytes(6, details);
  return concat(
    Uint8Array.from([...tag(1, 0), ...encodeVarint(payload.nonce ?? 1)]),
    encodeBytes(2, clientMsg),
  );
}
