/**
 * Minimal WorkAdventure-like pusher for local bridge verification.
 * Implements POST /anonymLogin and WS /ws/room accepting JoinRoom frames.
 */
import { createServer, type IncomingMessage, type Server } from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer, type WebSocket } from "ws";

export interface MockJoin {
  name: string;
  roomId: string;
  raw: Buffer;
}

export interface MockWaServer {
  playUrl: string;
  joins: MockJoin[];
  close(): Promise<void>;
}

export async function startMockWaServer(port = 0): Promise<MockWaServer> {
  const joins: MockJoin[] = [];
  const server: Server = createServer((req, res) => {
    if (req.method === "POST" && req.url?.startsWith("/anonymLogin")) {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ authToken: `tok-${randomUUID()}`, userUuid: randomUUID() }));
      return;
    }
    res.writeHead(404);
    res.end("not found");
  });

  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket, head) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    if (!url.pathname.startsWith("/ws/room")) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    const roomId = url.searchParams.get("roomId") ?? "";
    ws.on("message", (data) => {
      const raw = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);
      joins.push({ name: extractPlayerName(raw), roomId, raw });
    });
  });

  await new Promise<void>((resolve) => server.listen(port, "127.0.0.1", resolve));
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("failed to bind mock WA");
  const playUrl = `http://127.0.0.1:${addr.port}`;

  return {
    playUrl,
    joins,
    close: async () => {
      for (const client of wss.clients) {
        client.terminate();
      }
      await new Promise<void>((resolve, reject) => {
        wss.close((err) => (err ? reject(err) : resolve()));
      });
      await new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
    },
  };
}

/**
 * Walk protobuf length-delimited string fields and return the JoinRoom name
 * (field 3 of JoinRoomFrontMessage — typically the only short alphabetic string).
 */
function extractPlayerName(buf: Buffer): string {
  const strings: string[] = [];
  let i = 0;
  while (i < buf.length) {
    const key = buf[i]!;
    i += 1;
    const wireType = key & 0x07;
    if (wireType === 0) {
      // varint
      while (i < buf.length && buf[i]! >= 0x80) i += 1;
      i += 1;
    } else if (wireType === 2) {
      let len = 0;
      let shift = 0;
      while (i < buf.length) {
        const b = buf[i]!;
        i += 1;
        len |= (b & 0x7f) << shift;
        if (b < 0x80) break;
        shift += 7;
      }
      const slice = buf.subarray(i, i + len);
      i += len;
      // Recurse into nested messages; also collect utf-8 strings.
      const asText = slice.toString("utf8");
      if (/^[A-Za-z][A-Za-z0-9 _-]{0,31}$/.test(asText)) {
        strings.push(asText);
      } else {
        strings.push(...collectStrings(slice));
      }
    } else {
      break;
    }
  }
  // Prefer the longest alphabetic token (player names over short enum noise).
  return strings.sort((a, b) => b.length - a.length)[0] ?? "(unknown)";
}

function collectStrings(buf: Buffer): string[] {
  const out: string[] = [];
  let i = 0;
  while (i < buf.length) {
    const key = buf[i]!;
    i += 1;
    const wireType = key & 0x07;
    if (wireType === 0) {
      while (i < buf.length && buf[i]! >= 0x80) i += 1;
      i += 1;
    } else if (wireType === 2) {
      let len = 0;
      let shift = 0;
      while (i < buf.length) {
        const b = buf[i]!;
        i += 1;
        len |= (b & 0x7f) << shift;
        if (b < 0x80) break;
        shift += 7;
      }
      const slice = buf.subarray(i, i + len);
      i += len;
      const asText = slice.toString("utf8");
      if (/^[A-Za-z][A-Za-z0-9 _-]{0,31}$/.test(asText)) out.push(asText);
      else out.push(...collectStrings(slice));
    } else {
      break;
    }
  }
  return out;
}
