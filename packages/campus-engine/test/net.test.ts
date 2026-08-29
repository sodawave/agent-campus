import { describe, expect, it } from "vitest";
import {
  CampusClient,
  CampusServer,
  buildBuilding,
  buildCampus,
  buildRoom,
  createInMemoryPair,
} from "../src/index";

function connect(server: CampusServer): CampusClient {
  const [serverSide, clientSide] = createInMemoryPair();
  server.handle(serverSide);
  return new CampusClient(clientSide);
}

describe("net — CampusServer/CampusClient over in-memory transport", () => {
  it("client projects the same state as the server after commands", async () => {
    const server = new CampusServer();
    const client = connect(server);

    const r1 = await client.send({ type: "campus.load", campus: buildCampus({ id: "c1", name: "Demo Co" }) });
    expect(r1.ok).toBe(true);
    await client.send({ type: "building.spawn", building: buildBuilding({ id: "b1", campusId: "c1", name: "Alpha" }) });
    await client.send({ type: "room.spawn", room: buildRoom({ id: "r1", buildingId: "b1", key: "mkt" }) });

    expect(client.state()).toEqual(server.state());
    expect(client.state().buildings.map((b) => b.id)).toEqual(["b1"]);
  });

  it("two clients converge to the same state", async () => {
    const server = new CampusServer();
    const a = connect(server);
    const b = connect(server);

    await a.send({ type: "campus.load", campus: buildCampus({ id: "c1", name: "Demo Co" }) });
    await a.send({ type: "building.spawn", building: buildBuilding({ id: "b1", campusId: "c1", name: "Alpha" }) });

    expect(b.state()).toEqual(a.state());
    expect(b.state()).toEqual(server.state());
  });

  it("rejection is returned to the sender and not applied anywhere", async () => {
    const server = new CampusServer();
    const a = connect(server);
    const b = connect(server);
    await a.send({ type: "campus.load", campus: buildCampus({ id: "c1", name: "Demo Co" }) });

    const rejected = await a.send({ type: "room.spawn", room: buildRoom({ id: "rX", buildingId: "nope", key: "x" }) });
    expect(rejected).toEqual({ ok: false, reason: "building_not_found" });
    expect(server.state().rooms).toEqual([]);
    expect(b.state().rooms).toEqual([]);
  });

  it("late-joining client catches up via snapshot", async () => {
    const server = new CampusServer();
    const a = connect(server);
    await a.send({ type: "campus.load", campus: buildCampus({ id: "c1", name: "Demo Co" }) });
    await a.send({ type: "building.spawn", building: buildBuilding({ id: "b1", campusId: "c1", name: "Alpha" }) });

    // Connect a second client after state already exists.
    const late = connect(server);
    expect(late.state()).toEqual(server.state());
    expect(late.state().buildings.map((b) => b.id)).toEqual(["b1"]);
  });

  it("subscribe notifies the client projection on remote events", async () => {
    const server = new CampusServer();
    const a = connect(server);
    const b = connect(server);
    const seen: number[] = [];
    b.subscribe((s) => seen.push(s.buildings.length));

    await a.send({ type: "campus.load", campus: buildCampus({ id: "c1", name: "Demo Co" }) });
    await a.send({ type: "building.spawn", building: buildBuilding({ id: "b1", campusId: "c1", name: "Alpha" }) });

    expect(seen.at(-1)).toBe(1);
  });
});
