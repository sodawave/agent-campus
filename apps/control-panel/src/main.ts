import "./style.css";

/**
 * Control Panel — a web app that talks to the campus core over the GraphQL
 * surface (HTTP). Language-neutral: it shares no code with the engine. For now
 * it reads the campus state and edits config (language / timezone). Providers /
 * models and the connection token come later.
 */

const GRAPHQL_URL = `http://${location.hostname}:8788/graphql`;

interface Config {
  language: string;
  timezone: string;
}
interface CampusData {
  name: string | null;
  config: Config;
  buildings: { id: string; name: string }[];
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
  </div>
`;

const dot = document.getElementById("dot")!;
const sub = document.getElementById("sub")!;
const langInput = document.getElementById("language") as HTMLInputElement;
const tzInput = document.getElementById("timezone") as HTMLInputElement;
const msg = document.getElementById("msg")!;
const overview = document.getElementById("overview")!;

const QUERY = `{
  campus {
    name
    config { language timezone }
    buildings { id name }
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

void load();
