import "./style.css";
import {
  CampusClient,
  type CampusCommand,
  type CommandResult,
  type Connection,
  type State,
} from "@agent-campus/campus-engine";

const WS_URL = `ws://${location.hostname}:8787`;

/** Adapt a browser WebSocket to the engine's transport-agnostic Connection. */
function wsConnection(ws: WebSocket): Connection {
  return {
    send: (data) => ws.send(data),
    onMessage: (cb) =>
      ws.addEventListener("message", (e) =>
        cb(typeof e.data === "string" ? e.data : String(e.data)),
      ),
    onClose: (cb) => ws.addEventListener("close", () => cb()),
    close: () => ws.close(),
  };
}

const app = document.getElementById("app")!;
app.innerHTML = `
  <div class="top">
    <span class="dot" id="dot"></span>
    <h1>Agent Campus — Viewer</h1>
    <span class="sub" id="sub">connecting…</span>
  </div>
  <div class="wrap">
    <div class="panel">
      <h2>Campus (projection)</h2>
      <div id="view"></div>
      <div class="row" id="controls"></div>
    </div>
    <div class="panel">
      <h2>Command results</h2>
      <div class="log" id="log"></div>
    </div>
    <div class="panel"><h2>Workers</h2><div id="workers"></div></div>
    <div class="panel"><h2>Tasks</h2><div id="tasks"></div></div>
    <div class="panel"><h2>Execution — hosts / runtimes</h2><div id="exec"></div></div>
    <div class="panel"><h2>SDD &amp; Library</h2><div id="sdd"></div></div>
  </div>
`;

const dot = document.getElementById("dot")!;
const sub = document.getElementById("sub")!;
const view = document.getElementById("view")!;
const controls = document.getElementById("controls")!;
const logEl = document.getElementById("log")!;
const workersEl = document.getElementById("workers")!;
const tasksEl = document.getElementById("tasks")!;
const execEl = document.getElementById("exec")!;
const sddEl = document.getElementById("sdd")!;

const esc = (s: string) => s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c] ?? c);

let status: "connecting" | "open" | "closed" = "connecting";
let seq = 0;

const ws = new WebSocket(WS_URL);
const client = new CampusClient(wsConnection(ws));

ws.addEventListener("open", () => {
  status = "open";
  renderStatus();
  renderControls();
});
ws.addEventListener("close", () => {
  status = "closed";
  renderStatus();
});

client.subscribe(render);

function renderStatus(): void {
  dot.className = `dot ${status}`;
  sub.textContent = `core ${WS_URL} · ${status}`;
}

function render(state: State = client.state()): void {
  if (!state.campus) {
    view.innerHTML = `<span class="muted">no campus loaded</span>`;
    workersEl.innerHTML = tasksEl.innerHTML = execEl.innerHTML = sddEl.innerHTML = "";
    return;
  }

  const buildings = state.buildings
    .map((b) => {
      const sk = state.specKits.find((s) => s.buildingId === b.id);
      const phase = sk ? `<span class="badge">SDD: ${sk.phase}</span>` : "";
      const rooms = state.rooms.filter((r) => r.buildingId === b.id);
      const roomsHtml = rooms
        .map((r) => {
          const agents = state.agents
            .filter((a) => a.roomId === r.id)
            .map((a) => {
              const live = a.hostId != null && a.runtimeId != null;
              const rank = a.rankKey ? `·${esc(a.rankKey)}` : "";
              const head = r.headAgentId === a.id ? " ★" : "";
              const liveDot = live ? `<span class="live" title="live runtime">●</span>` : "";
              return `<span class="agent">${liveDot}${esc(a.name)}<span class="muted">${rank}</span>${head}</span>`;
            })
            .join("");
          return `<div class="room">· ${esc(r.key)} ${agents || '<span class="muted">(empty)</span>'}</div>`;
        })
        .join("");
      return `<div class="building"><div class="name">${esc(b.name)} ${phase}</div>${roomsHtml}</div>`;
    })
    .join("");
  view.innerHTML = `<div class="muted">${esc(state.campus.name)} — ${state.buildings.length} buildings · ${state.agents.length} agents · ${state.workers.length} workers</div>${buildings}`;

  // Workers
  workersEl.innerHTML =
    state.workers.length === 0
      ? `<span class="muted">none</span>`
      : state.workers
          .map((w) => {
            const room = state.rooms.find((r) => r.id === w.roomId)?.key ?? w.roomId;
            return `<div class="row-item"><span class="agent">${esc(w.name)}</span> <span class="muted">@ ${esc(room)} · by ${esc(w.spawnedById ?? "?")}</span></div>`;
          })
          .join("");

  // Tasks
  tasksEl.innerHTML =
    state.tasks.length === 0
      ? `<span class="muted">none</span>`
      : state.tasks
          .map(
            (t) =>
              `<div class="row-item">${esc(t.title)} <span class="badge status-${t.status}">${t.status}</span> <span class="muted">→ ${esc(t.assigneeId)}</span></div>`,
          )
          .join("");

  // Execution
  const hosts = state.hosts
    .map((h) => `<div class="row-item">🖥 ${esc(h.label)} <span class="muted">(${h.status})</span></div>`)
    .join("");
  const runtimes = state.runtimes
    .map(
      (rt) =>
        `<div class="row-item"><span class="badge status-${rt.status}">${rt.status}</span> ${esc(rt.agentId)} <span class="muted">${rt.workingDir ? "· " + esc(rt.workingDir) : ""}</span></div>`,
    )
    .join("");
  execEl.innerHTML =
    state.hosts.length === 0 && state.runtimes.length === 0
      ? `<span class="muted">none</span>`
      : `${hosts}${runtimes}`;

  // SDD & Library
  const docs = state.documents
    .map((d) => `<div class="row-item">📄 ${esc(d.title)} <span class="muted">(${esc(d.kind)})</span></div>`)
    .join("");
  sddEl.innerHTML =
    `<div class="muted">${state.classifications.length} classifications · ${state.documents.length} documents</div>${docs || ""}`;
}

function log(result: CommandResult, label: string): void {
  const line = document.createElement("div");
  if (result.ok) {
    line.innerHTML = `<span class="ok">✓</span> ${label} → <span class="muted">${result.event.type}</span>`;
  } else {
    line.innerHTML = `<span class="err">✗</span> ${label} → <span class="err">${result.reason}</span>`;
  }
  logEl.prepend(line);
}

async function send(command: CampusCommand, label: string): Promise<void> {
  const result = await client.send(command);
  log(result, label);
}

function renderControls(): void {
  controls.innerHTML = "";
  const mk = (text: string, fn: () => void) => {
    const b = document.createElement("button");
    b.textContent = text;
    b.onclick = fn;
    controls.appendChild(b);
  };

  mk("Spawn building", () => {
    const campusId = client.state().campus?.id ?? "campus-demo";
    const id = `b-${++seq}-${Date.now().toString(36)}`;
    void send({ type: "building.spawn", building: { id, campusId, name: `Project ${id}` } }, "building.spawn");
  });

  mk("Spawn room (in 1st building)", () => {
    const b = client.state().buildings[0];
    if (!b) return;
    const id = `r-${++seq}-${Date.now().toString(36)}`;
    void send({ type: "room.spawn", room: { id, buildingId: b.id, key: `dept-${seq}` } }, "room.spawn");
  });

  mk("Instantiate agent (1st room)", () => {
    const r = client.state().rooms[0];
    if (!r) return;
    const id = `a-${++seq}-${Date.now().toString(36)}`;
    void send(
      { type: "agent.instantiate", agent: { id, name: `Agent ${seq}`, kind: "named", buildingId: r.buildingId, roomId: r.id } },
      "agent.instantiate",
    );
  });

  mk("Try invalid (bad room)", () => {
    void send({ type: "room.spawn", room: { id: `bad-${++seq}`, buildingId: "nope", key: "x" } }, "room.spawn(bad)");
  });
}

renderStatus();
render();
