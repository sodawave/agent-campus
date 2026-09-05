import { describe, expect, it } from "vitest";
import { encodeJoinRoomFrame, encodeUserMovesFrame } from "../src/waProto";

describe("encodeJoinRoomFrame", () => {
  it("produces a non-empty protobuf frame with the agent name bytes", () => {
    const frame = encodeJoinRoomFrame({ name: "Mia", x: 320, y: 320, nonce: 1 });
    expect(frame.byteLength).toBeGreaterThan(10);
    const asText = new TextDecoder().decode(frame);
    expect(asText).toContain("Mia");
  });
});

describe("encodeUserMovesFrame", () => {
  it("encodes a non-empty frame distinct from JoinRoom", () => {
    const frame = encodeUserMovesFrame({ x: 400, y: 500, nonce: 2 });
    expect(frame.byteLength).toBeGreaterThan(8);
    const join = encodeJoinRoomFrame({ name: "Mia", x: 400, y: 500, nonce: 2 });
    expect(Buffer.from(frame).equals(Buffer.from(join))).toBe(false);
  });
});
