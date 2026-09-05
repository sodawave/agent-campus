import { describe, expect, it } from "vitest";
import { resolveWaRoomUrl } from "../src/roomUrl";

describe("resolveWaRoomUrl", () => {
  it("prefers building binding over default", () => {
    expect(resolveWaRoomUrl({ waRoomUrl: "http://play/~/a/map.wam" }, "http://fallback")).toBe(
      "http://play/~/a/map.wam",
    );
  });

  it("falls back when missing or blank", () => {
    expect(resolveWaRoomUrl({}, "http://fallback")).toBe("http://fallback");
    expect(resolveWaRoomUrl({ waRoomUrl: null }, "http://fallback")).toBe("http://fallback");
    expect(resolveWaRoomUrl({ waRoomUrl: "  " }, "http://fallback")).toBe("http://fallback");
  });
});
