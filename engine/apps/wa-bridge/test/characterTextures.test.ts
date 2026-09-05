import { describe, expect, it } from "vitest";
import { isWokaTextureId, texturesForAgent } from "../src/characterTextures";

describe("texturesForAgent", () => {
  it("uses appearance.skinKey when it is a WOKA id", () => {
    expect(texturesForAgent({ id: "a1", appearance: { skinKey: "female3" } })).toEqual(["female3"]);
  });

  it("ignores non-WOKA skin keys and picks stably from the palette", () => {
    const a = texturesForAgent({ id: "a-mia", appearance: { skinKey: "staff" } });
    const b = texturesForAgent({ id: "a-mia", appearance: { skinKey: "staff" } });
    expect(a).toEqual(b);
    expect(a).toHaveLength(1);
    expect(isWokaTextureId(a[0]!)).toBe(true);
  });

  it("gives different agents different textures often enough", () => {
    const ids = ["a-mia", "a-ivan", "a-joy", "a-kev", "a-luz", "b-alpha-leader-agent", "b-beta-leader-agent", "b-gamma-leader-agent"];
    const set = new Set(ids.map((id) => texturesForAgent({ id })[0]));
    expect(set.size).toBeGreaterThan(1);
  });
});
