import "./style.css";
import {
  CampusStore,
  type CampusCommand,
  type CampusEvent,
} from "@agent-campus/campus-engine";

const WS_URL = `ws://${location.hostname}:8787`;

/** Read-only projection of the core, rebuilt from the event stream. */
const projection = new CampusStore();
let status: "connecting" | "open" | "closed" = "connecting";

const app = document.getElementById("app")!;
app.innerHTML = `
  <div class="top">
    <span class="dot" id="dot"></span>
    <h1>Agent Campus — Viewer</h1>
    <span class="sub" id="sub"></span>
  </div>
  <div class="wrap">
    <div>
      <div class="panel">
        <h2>Controls — send Commands to the core</h2>
        <div class="row" id="controls"></div>
        <p class="hint">The viewer holds no state or rules: it sends Commands and renders the events the core sends back.</p>
      </div>
      <div class="panel"><h2>Campus — projected from the core</h2><div id="state"></div></div>
    </div>
    <div class="panel"><h2>Event stream</h2><div class="log" id="log"></div></div>
  </div>
`;

const dot = document.getElementById("dot")!;
const sub = document.getElementById("sub")!;
const stateEl = document.getElementById("state")!;
const logEl = document.getElementById("log")!;
const controls = document.getElementById("controls")!;

function el(tag: string, cls?: string, text?: string): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  return e;
}

function colorFromString(s: string): string {
  let hash = 0;
  for (let i = 0; i < s.length; i++) hash = (hash << 5) - hash + s.charCodeAt(i);
  return `hsl(${Math.abs(hash) % 360} 70% 62%)`;
}
function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "?") + (p.length > 1 ? (p[p.length - 1]?.[0] ?? "") : "")).toUpperCase();
}

const ws = new WebSocket(WS_URL);
ws.onopen = () => {
  status = "open";
  render();
};
ws.onclose = () => {
  status = "closed";
  render();
};
ws.onmessage = (ev) => {
  const msg = JSON.parse(ev.data) as
    | { type: "snapshot"; log: CampusEvent[] }
    | { type: "event"; event: CampusEvent }
    | { type: "result"; result: unknown };
  if (msg.type === "snapshot") for (const e of msg.log) projection.dispatch(e);
  else if (msg.type === "event") projection.dispatch(msg.event);
  render();
};

function send(command: CampusCommand): void {
  ws.send(JSON.stringify({ id: crypto.randomUUID(), command }));
}

// Demo controls (each is a Command to the core)
const btnWorker = el("button", "btn", "Spawn worker (ic)");
btnWorker.onclick = () => {
  const ic = projection.namedAgents().find((a) => a.rankKey === "ic");
  if (ic) send({ type: "worker.spawn", actorId: ic.id, label: "Worker" });
};
const btnBuilding = el("button", "btn", "Add building 'Beta Labs'");
btnBuilding.onclick = () => send({ type: "building.spawn", name: "Beta Labs" });
controls.append(btnWorker, btnBuilding);

function render(): void {
  dot.className = `dot${status === "open" ? " on" : ""}`;
  sub.textContent = `core: ${WS_URL} (headless) · ${status} · live agents: ${projection.liveAgents().length}`;

  // Campus → buildings → rooms → agents
  stateEl.replaceChildren();
  const buildings = projection.getState().buildings;
  if (!buildings.length) {
    stateEl.append(el("div", "empty", "Waiting for core…"));
  }
  for (const b of buildings) {
    const card = el("div", "bld");
    card.append(el("div", "bld-h", `${b.name}${b.context.product ? " — " + b.context.product : ""}`));
    for (const w of projection.workspacesOf(b.id)) {
      const room = el("div", "room");
      room.append(el("div", "room-h", `${w.name} · ${w.key} · ${w.role}`));
      const inRoom = projection.agentsInBuilding(b.id).filter((a) => a.workspaceId === w.id);
      if (!inRoom.length) room.append(el("div", "empty", "(vacío)"));
      for (const a of inRoom) {
        const row = el("div", "agent");
        const mini = el("div", "mini", a.kind === "anonymous_worker" ? "•" : initials(a.name));
        mini.style.background = a.kind === "anonymous_worker" ? "#7ee787" : colorFromString(a.name);
        row.append(mini, el("span", undefined, a.name), el("span", "badge rank", a.rankKey));
        if (a.runtimeId != null) row.append(el("span", "badge alive", "vivo"));
        room.append(row);
      }
      card.append(room);
    }
    stateEl.append(card);
  }

  // Event stream (facts from the core)
  logEl.replaceChildren();
  for (const e of [...projection.getEventLog()].slice(-16).reverse()) {
    const line = el("div");
    line.append(el("b", undefined, e.type));
    logEl.append(line);
  }
}

render();
