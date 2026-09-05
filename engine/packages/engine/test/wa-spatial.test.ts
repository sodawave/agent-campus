import { describe, expect, it } from "vitest";
import { CampusStore } from "../src/index";

function withBuilding() {
  const store = new CampusStore();
  store.campus.load({ id: "c1", name: "Campus" });
  store.building.spawn({ id: "casa", name: "Casa" });
  return store;
}

describe("building.waRoomUrl (spatial contract 049)", () => {
  it("binds and clears a WorkAdventure map URL on a building", () => {
    const store = withBuilding();
    const url = "http://play.workadventure.localhost/~/campus/casa/map.wam";
    const set = store.building.setWaRoomUrl({ buildingId: "casa", waRoomUrl: url });
    expect(set.ok).toBe(true);
    expect(store.state().buildings.find((b) => b.id === "casa")?.waRoomUrl).toBe(url);

    const clear = store.building.setWaRoomUrl({ buildingId: "casa", waRoomUrl: null });
    expect(clear.ok).toBe(true);
    expect(store.state().buildings.find((b) => b.id === "casa")?.waRoomUrl).toBeNull();
  });

  it("rejects empty string and unknown building", () => {
    const store = withBuilding();
    expect(store.building.setWaRoomUrl({ buildingId: "casa", waRoomUrl: "  " }).ok).toBe(false);
    expect(store.building.setWaRoomUrl({ buildingId: "nope", waRoomUrl: "http://x" }).ok).toBe(false);
  });

  it("accepts waRoomUrl on spawn", () => {
    const store = new CampusStore();
    store.campus.load({ id: "c1", name: "Campus" });
    const url = "http://play.workadventure.localhost/~/campus/acme/map.wam";
    store.building.spawn({ id: "acme", name: "Acme", waRoomUrl: url });
    expect(store.state().buildings.find((b) => b.id === "acme")?.waRoomUrl).toBe(url);
  });
});

describe("room.waAreaId (spatial contract 049)", () => {
  it("binds a WA editor area id to a room", () => {
    const store = withBuilding();
    const res = store.room.setWaAreaId({ roomId: "casa-leader", waAreaId: "private-office" });
    expect(res.ok).toBe(true);
    expect(store.state().rooms.find((r) => r.id === "casa-leader")?.waAreaId).toBe("private-office");
  });
});
