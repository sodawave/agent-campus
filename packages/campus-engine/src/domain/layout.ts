/**
 * Building layout: geometry (from Tiled/JSON) separated from semantics.
 * See TECH_SPEC §5.2. Pure data — no renderer imports.
 */

import type { WorkspaceRole } from "./types";

export interface TileRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RoomDef {
  id: string;
  workspaceKey?: string | null;
  role: WorkspaceRole;
  rect: TileRect;
  entrances?: { x: number; y: number }[];
  carpetTint?: string;
}

export type AnchorKind =
  | "podium"
  | "seat"
  | "desk"
  | "terminal"
  | "stand";

export interface AnchorDef {
  id: string;
  roomId: string;
  kind: AnchorKind;
  x: number;
  y: number;
  facing?: "up" | "down" | "left" | "right";
}

export interface PortraitSlot {
  id: string;
  x: number;
  y: number;
  bind: "agent" | "workspace" | "run";
}

export interface BuildingLayout {
  id: string;
  tilemapUrl?: string;
  tilesetUrl?: string;
  rooms: RoomDef[];
  anchors: AnchorDef[];
  portraits: PortraitSlot[];
}
