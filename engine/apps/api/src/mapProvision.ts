import { execFile } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { CampusLink } from "./link";

const execFileAsync = promisify(execFile);

export function defaultPlayBase(): string {
  return process.env.WA_PLAY_URL ?? "http://play.workadventure.localhost";
}

export function mapRoomUrl(directory: string, playBase = defaultPlayBase()): string {
  const base = playBase.replace(/\/$/, "");
  return `${base}/~/${directory}/starter/map.wam`;
}

function uploadScriptPath(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  // engine/apps/api/src → repo root
  return path.resolve(here, "../../../../../scripts/wa/upload-starter-to-map-storage.sh");
}

export async function uploadStarterMap(directory: string): Promise<{ ok: true; stdout: string } | { ok: false; reason: string }> {
  try {
    const { stdout, stderr } = await execFileAsync("bash", [uploadScriptPath()], {
      env: { ...process.env, MAP_STORAGE_DIRECTORY: directory },
      maxBuffer: 2 * 1024 * 1024,
    });
    return { ok: true, stdout: `${stdout}${stderr}`.trim() };
  } catch (err) {
    return { ok: false, reason: err instanceof Error ? err.message : String(err) };
  }
}

/** Ensure building exists, upload starter map under directory, bind waRoomUrl. */
export async function provisionBuildingMap(
  link: CampusLink,
  input: { id: string; name: string; directory?: string; playBase?: string },
): Promise<string> {
  const directory = input.directory ?? input.id;
  const campusId = link.state().campus?.id ?? "";
  if (!link.state().buildings.some((b) => b.id === input.id)) {
    const spawned = await link.send({
      type: "building.spawn",
      building: { id: input.id, campusId, name: input.name },
    });
    if (!spawned.ok) return `rejected: ${spawned.reason}`;
  }

  const upload = await uploadStarterMap(directory);
  if (!upload.ok) {
    return JSON.stringify({ ok: false, stage: "upload", reason: upload.reason });
  }

  const waRoomUrl = mapRoomUrl(directory, input.playBase);
  const bound = await link.send({
    type: "building.setWaRoomUrl",
    buildingId: input.id,
    waRoomUrl,
  });
  if (!bound.ok) return `rejected: ${bound.reason}`;

  return JSON.stringify({
    ok: true,
    buildingId: input.id,
    directory,
    waRoomUrl,
    upload: upload.stdout.slice(0, 500),
  });
}
