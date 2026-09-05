/** Default WorkAdventure WOKA ids from play local catalog (`woka.json`). */
export const DEFAULT_WOKA_TEXTURE_IDS = [
  "male1",
  "male2",
  "male3",
  "male4",
  "male5",
  "male6",
  "female1",
  "female2",
  "female3",
  "female4",
  "female5",
  "female6",
] as const;

const WOKA_ID_RE = /^(male|female)\d+$/;

export function isWokaTextureId(id: string): boolean {
  return WOKA_ID_RE.test(id);
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Resolve character textures for a join.
 * Prefer `appearance.skinKey` when it is a WA WOKA id; otherwise pick stably from the palette.
 */
export function texturesForAgent(
  agent: { id: string; appearance?: { skinKey?: string } },
  fallback: string[] = ["male1"],
): string[] {
  const key = agent.appearance?.skinKey;
  if (key && isWokaTextureId(key)) return [key];
  const palette = DEFAULT_WOKA_TEXTURE_IDS;
  if (palette.length === 0) return fallback.length > 0 ? fallback : ["male1"];
  const pick = palette[hashId(agent.id) % palette.length];
  return pick ? [pick] : fallback;
}
