import { describe, expect, it } from "vitest";
import { CampusStore, DEFAULT_CONFIG } from "../src/index";

function withCampus() {
  const store = new CampusStore();
  store.campus.load({ id: "c1", name: "Campus" });
  return store;
}

describe("campus config (language + timezone)", () => {
  it("defaults to en / UTC", () => {
    const store = withCampus();
    expect(store.state().config).toEqual(DEFAULT_CONFIG);
    expect(DEFAULT_CONFIG).toEqual({ language: "en", timezone: "UTC" });
  });

  it("setConfig patches language and timezone independently", () => {
    const store = withCampus();
    expect(store.campus.setConfig({ language: "es" }).ok).toBe(true);
    expect(store.state().config).toEqual({ language: "es", timezone: "UTC" });
    expect(store.campus.setConfig({ timezone: "Europe/Madrid" }).ok).toBe(true);
    expect(store.state().config).toEqual({ language: "es", timezone: "Europe/Madrid" });
  });

  it("rejects setConfig before a campus is loaded", () => {
    const store = new CampusStore();
    expect(store.campus.setConfig({ language: "es" })).toEqual({ ok: false, reason: "campus_not_loaded" });
  });
});
