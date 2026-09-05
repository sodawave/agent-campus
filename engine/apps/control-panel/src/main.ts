import "./style.css";

/**
 * Control Panel — a web app that talks to the campus core over the GraphQL
 * surface (HTTP). Language-neutral: it shares no code with the engine. For now
 * it reads the campus state and edits config (language / timezone). Providers /
 * models and the connection token come later.
 */

const GRAPHQL_URL = `http://${location.hostname}:8788/graphql`;

interface Provider {
  id: string;
  name: string;
  models: string[];
}
interface Config {
  language: string;
  timezone: string;
  providers: Provider[];
  defaultModel: { providerId: string; model: string } | null;
}
interface CampusData {
  name: string | null;
  config: Config;
  buildings: { id: string; name: string; waRoomUrl: string | null }[];
  agents: { id: string; name: string }[];
  projects: { id: string; name: string; status: string }[];
}

async function gql<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  const res = await fetch(GRAPHQL_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0]?.message ?? "GraphQL error");
  return json.data as T;
}

const app = document.getElementById("app")!;
app.innerHTML = `
  <div class="top">
    <span class="dot" id="dot"></span>
    <h1>Agent Campus — Control Panel</h1>
    <span class="sub" id="sub">connecting…</span>
  </div>
  <div class="wrap">
    <div class="panel">
      <h2>System config</h2>
      <form id="config-form">
        <label for="language">Language</label>
        <input id="language" name="language" />
        <label for="timezone">Timezone (server)</label>
        <input id="timezone" name="timezone" />
        <button type="submit">Save config</button>
        <div id="msg"></div>
      </form>
      <p class="muted" style="margin-top:14px">Coming next: connection token, AI providers &amp; models.</p>
    </div>
    <div class="panel">
      <h2>Campus overview</h2>
      <div id="overview"></div>
    </div>
    <div class="panel">
      <h2>AI providers &amp; models</h2>
      <div id="providers"></div>
      <form id="provider-form">
        <label for="p-id">Provider id</label>
        <input id="p-id" placeholder="openai" />
        <label for="p-name">Name</label>
        <input id="p-name" placeholder="OpenAI" />
        <label for="p-models">Models (comma-separated)</label>
        <input id="p-models" placeholder="gpt-x, gpt-mini" />
        <button type="submit">Add / update provider</button>
        <div id="p-msg"></div>
      </form>
      <form id="default-form">
        <label for="d-provider">Default model — provider id</label>
        <input id="d-provider" placeholder="openai" />
        <label for="d-model">Model</label>
        <input id="d-model" placeholder="gpt-x" />
        <button type="submit">Set default model</button>
        <div id="d-msg"></div>
      </form>
    </div>
    <div class="panel">
      <h2>Maps (WorkAdventure)</h2>
      <p class="muted">Building = WA map. Provision uploads the starter map to map-storage and binds <code>waRoomUrl</code>.</p>
      <form id="map-form">
        <label for="m-id">Building id</label>
        <input id="m-id" placeholder="acme" required />
        <label for="m-name">Name</label>
        <input id="m-name" placeholder="Acme HQ" required />
        <label for="m-dir">Map-storage directory (optional)</label>
        <input id="m-dir" placeholder="defaults to building id" />
        <button type="submit">Provision map</button>
        <div id="m-msg"></div>
      </form>
      <div id="maps-list" style="margin-top:12px"></div>
    </div>
  </div>
`;

const dot = document.getElementById("dot")!;
const sub = document.getElementById("sub")!;
const langInput = document.getElementById("language") as HTMLInputElement;
const tzInput = document.getElementById("timezone") as HTMLInputElement;
const msg = document.getElementById("msg")!;
const overview = document.getElementById("overview")!;
const providersEl = document.getElementById("providers")!;
const pMsg = document.getElementById("p-msg")!;
const dMsg = document.getElementById("d-msg")!;
const pId = document.getElementById("p-id") as HTMLInputElement;
const pName = document.getElementById("p-name") as HTMLInputElement;
const pModels = document.getElementById("p-models") as HTMLInputElement;
const dProvider = document.getElementById("d-provider") as HTMLInputElement;
const dModel = document.getElementById("d-model") as HTMLInputElement;

const QUERY = `{
  campus {
    name
    config {
      language timezone
      providers { id name models }
      defaultModel { providerId model }
    }
    buildings { id name waRoomUrl }
    agents { id name }
    projects { id name status }
  }
}`;

async function load(): Promise<void> {
  try {
    const data = await gql<{ campus: CampusData }>(QUERY);
    const c = data.campus;
    dot.className = "dot open";
    sub.textContent = `core via ${GRAPHQL_URL}`;
    langInput.value = c.config.language;
    tzInput.value = c.config.timezone;
    overview.innerHTML = `
      <div class="row-item"><b>${c.name ?? "(no campus)"}</b></div>
      <div class="row-item">Buildings: ${c.buildings.map((b) => b.name).join(", ") || "-"}</div>
      <div class="row-item">Agents: ${c.agents.length}</div>
      <div class="row-item">Projects: ${c.projects.map((p) => `${p.name} (${p.status})`).join(", ") || "-"}</div>
    `;
    const mapsList = document.getElementById("maps-list")!;
    mapsList.innerHTML =
      c.buildings.length === 0
        ? `<div class="row-item muted">no buildings</div>`
        : c.buildings
            .map(
              (b) =>
                `<div class="row-item"><b>${b.name}</b> <code>${b.id}</code><br/><span class="muted">${b.waRoomUrl ?? "(no WA map)"}</span></div>`,
            )
            .join("");
    const def = c.config.defaultModel ? `${c.config.defaultModel.providerId} / ${c.config.defaultModel.model}` : "(none)";
    providersEl.innerHTML =
      `<div class="row-item muted">Default model: ${def}</div>` +
      (c.config.providers.length === 0
        ? `<div class="row-item muted">no providers</div>`
        : c.config.providers
            .map((p) => `<div class="row-item"><b>${p.name}</b> <span class="muted">(${p.id})</span>: ${p.models.join(", ") || "-"}</div>`)
            .join(""));
  } catch (err) {
    dot.className = "dot closed";
    sub.textContent = `error: ${err instanceof Error ? err.message : String(err)}`;
  }
}

document.getElementById("config-form")!.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.textContent = "";
  try {
    const data = await gql<{ setConfig: { ok: boolean; reason?: string } }>(
      `mutation($l: String, $t: String) { setConfig(language: $l, timezone: $t) { ok reason } }`,
      { l: langInput.value, t: tzInput.value },
    );
    if (data.setConfig.ok) {
      msg.className = "ok";
      msg.textContent = "✓ config saved";
      await load();
    } else {
      msg.className = "err";
      msg.textContent = `✗ ${data.setConfig.reason}`;
    }
  } catch (err) {
    msg.className = "err";
    msg.textContent = `✗ ${err instanceof Error ? err.message : String(err)}`;
  }
});

document.getElementById("provider-form")!.addEventListener("submit", async (e) => {
  e.preventDefault();
  pMsg.textContent = "";
  const models = pModels.value.split(",").map((m) => m.trim()).filter(Boolean);
  try {
    const data = await gql<{ addProvider: { ok: boolean; reason?: string } }>(
      `mutation($id: ID!, $name: String!, $models: [String!]!) { addProvider(id: $id, name: $name, models: $models) { ok reason } }`,
      { id: pId.value, name: pName.value, models },
    );
    if (data.addProvider.ok) {
      pMsg.className = "ok";
      pMsg.textContent = "✓ provider saved";
      await load();
    } else {
      pMsg.className = "err";
      pMsg.textContent = `✗ ${data.addProvider.reason}`;
    }
  } catch (err) {
    pMsg.className = "err";
    pMsg.textContent = `✗ ${err instanceof Error ? err.message : String(err)}`;
  }
});

document.getElementById("default-form")!.addEventListener("submit", async (e) => {
  e.preventDefault();
  dMsg.textContent = "";
  try {
    const data = await gql<{ setDefaultModel: { ok: boolean; reason?: string } }>(
      `mutation($p: ID!, $m: String!) { setDefaultModel(providerId: $p, model: $m) { ok reason } }`,
      { p: dProvider.value, m: dModel.value },
    );
    if (data.setDefaultModel.ok) {
      dMsg.className = "ok";
      dMsg.textContent = "✓ default set";
      await load();
    } else {
      dMsg.className = "err";
      dMsg.textContent = `✗ ${data.setDefaultModel.reason}`;
    }
  } catch (err) {
    dMsg.className = "err";
    dMsg.textContent = `✗ ${err instanceof Error ? err.message : String(err)}`;
  }
});

document.getElementById("map-form")!.addEventListener("submit", async (e) => {
  e.preventDefault();
  const mMsg = document.getElementById("m-msg")!;
  const mId = document.getElementById("m-id") as HTMLInputElement;
  const mName = document.getElementById("m-name") as HTMLInputElement;
  const mDir = document.getElementById("m-dir") as HTMLInputElement;
  mMsg.textContent = "";
  try {
    const data = await gql<{ provisionBuildingMap: { ok: boolean; payload: string } }>(
      `mutation($id: ID!, $name: String!, $directory: String) {
        provisionBuildingMap(id: $id, name: $name, directory: $directory) { ok payload }
      }`,
      {
        id: mId.value.trim(),
        name: mName.value.trim(),
        directory: mDir.value.trim() || null,
      },
    );
    mMsg.className = data.provisionBuildingMap.ok ? "ok" : "err";
    mMsg.textContent = data.provisionBuildingMap.payload.slice(0, 400);
    await load();
  } catch (err) {
    mMsg.className = "err";
    mMsg.textContent = `✗ ${err instanceof Error ? err.message : String(err)}`;
  }
});

void load();
