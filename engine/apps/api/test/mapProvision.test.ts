import { describe, expect, it } from "vitest";
import { mapRoomUrl } from "../src/mapProvision";

describe("mapProvision helpers", () => {
  it("mapRoomUrl builds /~/ starter path", () => {
    expect(mapRoomUrl("acme", "http://play.workadventure.localhost")).toBe(
      "http://play.workadventure.localhost/~/acme/starter/map.wam",
    );
  });
});
