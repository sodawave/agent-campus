/** Resolve WA room URL for an agent: building binding, else bridge default. */
export function resolveWaRoomUrl(
  agent: { waRoomUrl?: string | null },
  defaultRoomUrl: string,
): string {
  const bound = agent.waRoomUrl?.trim();
  return bound && bound.length > 0 ? bound : defaultRoomUrl;
}
