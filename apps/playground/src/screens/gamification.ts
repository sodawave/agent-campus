import type {
  AgentInstance,
  CampusEvent,
  RoomDef,
} from "@agent-campus/campus-engine";
import { activeBuilding, building, send, store, ui } from "../app";
import { clear, colorFromString, h, initials } from "../util";

const TILE = 24;
const PAD = 16;

interface Pt {
  x: number;
  y: number;
}

const positions = new Map<string, Pt>();

function bounds(): { w: number; h: number } {
  let maxX = 0;
  let maxY = 0;
  for (const r of building.rooms) {
    maxX = Math.max(maxX, r.rect.x + r.rect.w);
    maxY = Math.max(maxY, r.rect.y + r.rect.h);
  }
  return { w: maxX * TILE + PAD * 2, h: maxY * TILE + PAD * 2 };
}

function roomPx(r: RoomDef) {
  return {
    x: PAD + r.rect.x * TILE,
    y: PAD + r.rect.y * TILE,
    w: r.rect.w * TILE,
    h: r.rect.h * TILE,
  };
}

function gate(): Pt {
  const a = building.anchors.find((an) => an.kind === "stand");
  if (a) return { x: PAD + a.x * TILE, y: PAD + a.y * TILE };
  const { w, h } = bounds();
  return { x: w / 2, y: h - PAD };
}

/** roomId -> workspace label(s) for the active building. */
function roomLabels(): Map<string, string> {
  const b = activeBuilding();
  const workspaces = b ? store.workspacesOf(b.id) : [];
  const map = new Map<string, string[]>();
  for (const w of workspaces) {
    const list = map.get(w.roomId) ?? [];
    list.push(w.name);
    map.set(w.roomId, list);
  }
  const out = new Map<string, string>();
  for (const r of building.rooms) {
    const named = map.get(r.id);
    out.set(r.id, named ? named.join(" / ") : titleize(r.role));
  }
  return out;
}

function titleize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Where each agent should be, in pixels — scoped to the active building. */
function targets(): Map<string, Pt> {
  const b = activeBuilding();
  if (!b) return new Map();
  const workspaces = store.workspacesOf(b.id);
  const agents = store.agentsInBuilding(b.id);
  const roomOf = (a: AgentInstance): string | null => {
    const ws = workspaces.find((w) => w.id === a.workspaceId);
    return ws?.roomId ?? null;
  };

  const byRoom = new Map<string, AgentInstance[]>();
  for (const a of agents) {
    const rid = roomOf(a) ?? "room-hall";
    const list = byRoom.get(rid) ?? [];
    list.push(a);
    byRoom.set(rid, list);
  }

  const out = new Map<string, Pt>();
  for (const [rid, list] of byRoom) {
    const room = building.rooms.find((r) => r.id === rid);
    if (!room) continue;
    const px = roomPx(room);
    const spacing = 40;
    const innerX = px.x + 24;
    const innerY = px.y + 40;
    const perRow = Math.max(1, Math.floor((px.w - 40) / spacing));
    list.forEach((a, i) => {
      const col = i % perRow;
      const row = Math.floor(i / perRow);
      out.set(a.id, {
        x: innerX + col * spacing + 10,
        y: innerY + row * spacing + 10,
      });
    });
  }
  return out;
}

function drawRoundedToken(
  ctx: CanvasRenderingContext2D,
  p: Pt,
  agent: AgentInstance,
): void {
  const size = 24;
  const x = p.x - size / 2;
  const y = p.y - size / 2;
  const worker = agent.kind === "anonymous_worker";
  const color = worker ? "#7ee787" : colorFromString(agent.name);

  ctx.save();
  // shadow
  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.beginPath();
  ctx.ellipse(p.x, y + size + 3, size / 2.2, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // body
  ctx.fillStyle = color;
  roundRect(ctx, x, y, size, size, 6);
  ctx.fill();

  if (worker) {
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 2]);
    ctx.strokeStyle = "#0e1116";
    roundRect(ctx, x, y, size, size, 6);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // initials
  ctx.fillStyle = "#06131b";
  ctx.font = "700 10px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(worker ? "•" : initials(agent.name), p.x, p.y);

  // name label
  ctx.fillStyle = "#c8d3e0";
  ctx.font = "10px system-ui, sans-serif";
  ctx.fillText(worker ? "worker" : agent.name.split(" ")[0]!, p.x, y + size + 12);

  // introducing pulse
  if (agent.introducing) {
    ctx.strokeStyle = "#f0b429";
    ctx.lineWidth = 2;
    roundRect(ctx, x - 3, y - 3, size + 6, size + 6, 8);
    ctx.stroke();
  }

  // alive indicator: agent bound to a runtime on a host
  if (agent.runtimeId != null) {
    ctx.fillStyle = "#2ecc71";
    ctx.strokeStyle = "#0a0d12";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(x + size - 2, y + 2, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function draw(ctx: CanvasRenderingContext2D): void {
  const { w, h } = bounds();
  ctx.clearRect(0, 0, w, h);

  // campus ground
  ctx.fillStyle = "#0a0d12";
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "#141a22";
  for (let gx = PAD; gx <= w - PAD; gx += TILE) {
    ctx.beginPath();
    ctx.moveTo(gx, PAD);
    ctx.lineTo(gx, h - PAD);
    ctx.stroke();
  }
  for (let gy = PAD; gy <= h - PAD; gy += TILE) {
    ctx.beginPath();
    ctx.moveTo(PAD, gy);
    ctx.lineTo(w - PAD, gy);
    ctx.stroke();
  }

  const labels = roomLabels();

  // rooms
  for (const room of building.rooms) {
    const px = roomPx(room);
    const tint = room.carpetTint ?? "#334155";
    ctx.fillStyle = hexToRgba(tint, room.role === "hallway" ? 0.1 : 0.22);
    ctx.fillRect(px.x, px.y, px.w, px.h);
    ctx.strokeStyle = hexToRgba(tint, 0.9);
    ctx.lineWidth = 2;
    ctx.strokeRect(px.x + 1, px.y + 1, px.w - 2, px.h - 2);

    ctx.fillStyle = "#e6edf3";
    ctx.font = "600 12px system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(labels.get(room.id) ?? room.id, px.x + 10, px.y + 8);
    ctx.fillStyle = "#93a1b3";
    ctx.font = "10px ui-monospace, monospace";
    ctx.fillText(room.role, px.x + 10, px.y + 24);
  }

  // gate marker
  const g = gate();
  ctx.fillStyle = "#f0b429";
  ctx.font = "10px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("▲ campus gate", g.x, g.y + 16);

  // agents (with easing toward target)
  const tgt = targets();
  for (const [id, t] of tgt) {
    let cur = positions.get(id);
    if (!cur) {
      // new arrival: workers walk in from the gate, named agents pop in place
      const agent = store.getAgent(id);
      cur =
        agent?.kind === "anonymous_worker" ? { ...gate() } : { x: t.x, y: t.y };
      positions.set(id, cur);
    }
    cur.x += (t.x - cur.x) * 0.15;
    cur.y += (t.y - cur.y) * 0.15;
  }
  // drop stale positions
  for (const id of [...positions.keys()]) {
    if (!tgt.has(id)) positions.delete(id);
  }

  // draw in y-order (depth)
  const entries = [...tgt.keys()]
    .map((id) => ({ id, p: positions.get(id)! }))
    .sort((a, b) => a.p.y - b.p.y);
  for (const e of entries) {
    const agent = store.getAgent(e.id);
    if (agent) drawRoundedToken(ctx, e.p, agent);
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.replace("#", "");
  const bigint = parseInt(
    m.length === 3
      ? m
          .split("")
          .map((c) => c + c)
          .join("")
      : m,
    16,
  );
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function createGamification(): {
  root: HTMLElement;
  render: () => void;
} {
  const size = bounds();
  const canvas = h2("canvas");
  canvas.width = size.w;
  canvas.height = size.h;
  const ctx = canvas.getContext("2d")!;

  const canvasWrap = h("div", { class: "canvas-wrap" }, [canvas]);
  const switcherBar = h("div", { class: "row", style: "margin-bottom:12px" });
  const main = h("div", { class: "main" }, [
    h("p", { class: "hint" }, [
      "The campus holds several buildings (projects). Pick a building to enter it. Named agents stay in their home office; ic agents spawn/remove anonymous workers; a named agent can be loaned to another building (ProjectCall) without being cloned.",
    ]),
    switcherBar,
    canvasWrap,
  ]);

  const sidebar = h("div", { class: "sidebar" });
  const root = h("div", { class: "screen", dataset: { screen: "gamification" } }, [
    main,
    sidebar,
  ]);

  // animation loop
  const loop = () => {
    draw(ctx);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);

  const render = () => {
    clear(sidebar);
    clear(switcherBar);
    const state = store.getState();
    const current = activeBuilding();

    // Building switcher — the campus shows its active buildings.
    switcherBar.append(
      h("span", { class: "chip", style: "align-self:center" }, ["Campus:"]),
      ...state.buildings.map((b) => {
        const count = store.agentsInBuilding(b.id).length;
        return h(
          "button",
          {
            class: `tab${b.id === current?.id ? " active" : ""}`,
            onclick: () => {
              ui.activeBuildingId = b.id;
              render();
            },
          },
          [`${b.name} · ${count}`],
        );
      }),
    );

    const named = store.namedAgents();
    const actor = named.find((a) => a.id === ui.actorId) ?? named[0] ?? null;
    if (actor) ui.actorId = actor.id;

    // Actor picker
    const actorSelect = h(
      "select",
      {
        onchange: (e: Event) => {
          ui.actorId = (e.target as HTMLSelectElement).value;
          render();
        },
      },
      named.map((a) =>
        h(
          "option",
          { value: a.id, selected: a.id === actor?.id },
          [`${a.name} — ${a.rankKey}`],
        ),
      ),
    );

    const isIc = actor?.rankKey === "ic";
    const spawnBtn = h(
      "button",
      {
        class: "btn primary",
        disabled: !actor,
        onclick: () => {
          if (!actor) return;
          send({ type: "worker.spawn", actorId: actor.id, label: "Worker" });
        },
      },
      ["Spawn worker"],
    );

    const myWorkers = store
      .workers()
      .filter((wk) => wk.spawnedById === actor?.id);
    const removeBtn = h(
      "button",
      {
        class: "btn danger",
        disabled: !actor || myWorkers.length === 0,
        onclick: () => {
          if (!actor) return;
          const last = myWorkers[myWorkers.length - 1];
          if (last)
            send({ type: "worker.despawn", actorId: actor.id, workerId: last.id });
        },
      },
      ["Remove worker"],
    );

    const controls = h("div", { class: "panel" }, [
      h("h2", {}, ["Anonymous workers"]),
      h("label", { class: "field" }, ["Acting agent"]),
      actorSelect,
      h("p", { class: "hint" }, [
        isIc
          ? "This agent is ic — allowed to spawn workers."
          : "Only ic agents may spawn; try this to see a rejection event.",
      ]),
      h("div", { class: "row", style: "margin-top:10px" }, [spawnBtn, removeBtn]),
      h("p", { class: "hint" }, [
        `Live workers (this building): ${
          current
            ? store
                .agentsInBuilding(current.id)
                .filter((a) => a.kind === "anonymous_worker").length
            : 0
        }`,
      ]),
    ]);

    // Add named agent
    const nameInput = h2("input");
    nameInput.type = "text";
    nameInput.placeholder = "Agent name";
    const archSelect = h(
      "select",
      {},
      state.catalog.map((a) =>
        h("option", { value: a.id }, [`${a.title} (${a.defaultRankKey})`]),
      ),
    );
    const addBtn = h(
      "button",
      {
        class: "btn",
        onclick: () => {
          const name = nameInput.value.trim() || "New Agent";
          const b = activeBuilding();
          if (!b) return;
          send({
            type: "agent.spawn",
            request: { projectId: b.id, archetypeId: archSelect.value, name },
          });
          nameInput.value = "";
        },
      },
      ["Hire agent"],
    );

    const hire = h("div", { class: "panel" }, [
      h("h2", {}, ["Hire named agent"]),
      h("label", { class: "field" }, ["Archetype"]),
      archSelect,
      h("label", { class: "field" }, ["Name"]),
      nameInput,
      h("div", { class: "row", style: "margin-top:10px" }, [addBtn]),
    ]);

    // Transfer a named agent to another building (ProjectCall — no cloning)
    const otherBuildings = state.buildings.filter((b) => b.id !== current?.id);
    const transferables = current
      ? store
          .agentsInBuilding(current.id)
          .filter((a) => a.kind === "named" && a.activeCallId === null)
      : [];
    const transferAgentSel = h(
      "select",
      {},
      transferables.map((a) =>
        h("option", { value: a.id }, [`${a.name} — ${a.skill.label}`]),
      ),
    );
    const destSel = h(
      "select",
      {},
      otherBuildings.map((b) => h("option", { value: b.id }, [b.name])),
    );
    const sendBtn = h(
      "button",
      {
        class: "btn primary",
        disabled: transferables.length === 0 || otherBuildings.length === 0,
        onclick: () => {
          if (!transferAgentSel.value || !destSel.value) return;
          send({
            type: "agent.callToBuilding",
            agentId: transferAgentSel.value,
            toBuildingId: destSel.value,
            reason: "cross-building work",
          });
        },
      },
      ["Send to building"],
    );

    const away = store.agentsAwayFromHome();
    const awayRows = away.map((a) => {
      const dest = store.getBuilding(a.projectId);
      return h("div", { class: "row", style: "margin-top:6px" }, [
        h("span", { class: "chip" }, [`${a.name} → ${dest?.name ?? "?"}`]),
        h(
          "button",
          {
            class: "btn",
            onclick: () => send({ type: "agent.returnHome", agentId: a.id }),
          },
          ["Return home"],
        ),
      ]);
    });

    const transfer = h("div", { class: "panel" }, [
      h("h2", {}, ["Loan agent to building"]),
      h("label", { class: "field" }, ["Agent (in this building)"]),
      transferAgentSel,
      h("label", { class: "field" }, ["Destination building"]),
      destSel,
      h("div", { class: "row", style: "margin-top:10px" }, [sendBtn]),
      away.length
        ? h("div", {}, [
            h("p", { class: "hint" }, ["On loan (away from home):"]),
            ...awayRows,
          ])
        : h("p", { class: "hint" }, ["No agents on loan."]),
    ]);

    // Hosts & runtimes (execution plane)
    const hostRows = store.hosts().map((hh) =>
      h("div", { class: "row", style: "margin-top:6px" }, [
        h("span", { class: hh.status === "online" ? "chip worker" : "chip" }, [
          `${hh.label} · ${hh.status} · ${store.runtimesOf(hh.id).length} rt`,
        ]),
        h(
          "button",
          { class: "btn", onclick: () => send({ type: "host.leave", hostId: hh.id }) },
          ["Leave"],
        ),
      ]),
    );

    const joinInput = h2("input");
    joinInput.type = "text";
    joinInput.placeholder = "Host label (e.g. laptop-ana)";
    const joinBtn = h(
      "button",
      {
        class: "btn",
        onclick: () => {
          send({ type: "host.join", label: joinInput.value.trim() || "host" });
          joinInput.value = "";
        },
      },
      ["Join host"],
    );

    const dormant = store.namedAgents().filter((a) => a.runtimeId == null);
    const onlineHosts = store.hosts().filter((hh) => hh.status === "online");
    const rtAgentSel = h(
      "select",
      {},
      dormant.map((a) => h("option", { value: a.id }, [a.name])),
    );
    const rtHostSel = h(
      "select",
      {},
      onlineHosts.map((hh) => h("option", { value: hh.id }, [hh.label])),
    );
    const startRtBtn = h(
      "button",
      {
        class: "btn primary",
        disabled: dormant.length === 0 || onlineHosts.length === 0,
        onclick: () => {
          if (!rtAgentSel.value || !rtHostSel.value) return;
          send({
            type: "host.spawnRuntime",
            hostId: rtHostSel.value,
            agentId: rtAgentSel.value,
            workingDir: "/work/agent-campus",
          });
        },
      },
      ["Start runtime"],
    );

    const runtimeRows = store.runtimes().map((r) => {
      const ag = store.getAgent(r.agentId);
      const hh = store.getHost(r.hostId);
      return h("div", { class: "row", style: "margin-top:6px" }, [
        h("span", { class: "chip worker" }, [
          `${ag?.name ?? "?"} @ ${hh?.label ?? "?"}`,
        ]),
        h(
          "button",
          { class: "btn danger", onclick: () => send({ type: "host.stopRuntime", runtimeId: r.id }) },
          ["Stop"],
        ),
      ]);
    });

    const hostsPanel = h("div", { class: "panel" }, [
      h("h2", {}, ["Hosts & runtimes"]),
      hostRows.length
        ? h("div", {}, hostRows)
        : h("p", { class: "hint" }, ["No hosts joined."]),
      h("div", { class: "row", style: "margin-top:8px" }, [joinInput, joinBtn]),
      h("label", { class: "field" }, ["Start runtime (dormant agent → host)"]),
      h("div", { class: "row" }, [rtAgentSel, rtHostSel, startRtBtn]),
      h("p", { class: "hint", style: "margin-top:8px" }, [
        `Live agents: ${store.liveAgents().length}`,
      ]),
      ...runtimeRows,
    ]);

    // Event log
    const log = h(
      "div",
      { class: "log" },
      store
        .getEventLog()
        .slice(-14)
        .reverse()
        .map((ev) => renderEvent(ev)),
    );
    const logPanel = h("div", { class: "panel" }, [
      h("h2", {}, ["Event log"]),
      log,
    ]);

    sidebar.append(controls, transfer, hostsPanel, hire, logPanel);
  };

  render();
  return { root, render };
}

function renderEvent(ev: CampusEvent): HTMLElement {
  const warn =
    ev.type === "worker.spawn.rejected" || ev.type.includes("rejected");
  return h("div", { class: `ev${warn ? " warn" : ""}` }, [
    h("b", {}, [ev.type]),
    " " + summarize(ev),
  ]);
}

function summarize(ev: CampusEvent): string {
  switch (ev.type) {
    case "agent.instantiated":
      return ev.agent.name;
    case "worker.entered":
      return `by ${short(ev.spawnedById)}`;
    case "worker.exited":
      return `by ${short(ev.spawnedById)}`;
    case "worker.spawn.rejected":
      return `${short(ev.actorId)} (${ev.reason})`;
    case "org.head.assigned":
      return short(ev.headAgentId);
    case "order.issued":
      return ev.order.instruction;
    case "building.spawned":
      return ev.project.name;
    case "room.spawned":
      return ev.workspace.name;
    case "project.call.issued":
      return `${short(ev.call.agentId)} → ${short(ev.call.fromProjectId)}`;
    case "agent.building.entered":
      return `${short(ev.agentId)} → ${short(ev.projectId)}`;
    case "agent.returned_home":
      return short(ev.agentId);
    case "host.joined":
      return ev.host.label;
    case "host.left":
      return short(ev.hostId);
    case "runtime.started":
      return `${short(ev.runtime.agentId)} @ ${short(ev.runtime.hostId)}`;
    case "runtime.stopped":
      return short(ev.agentId);
    default:
      return "";
  }
}

function short(id: string): string {
  return id.length > 10 ? id.slice(0, 10) + "…" : id;
}

// typed element creators that need direct property access
function h2<K extends keyof HTMLElementTagNameMap>(
  tag: K,
): HTMLElementTagNameMap[K] {
  return document.createElement(tag);
}
