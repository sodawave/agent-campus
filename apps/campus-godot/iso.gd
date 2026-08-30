class_name Iso
extends RefCounted

## Isometric (2:1 dimetric) helpers for the clay campus diorama.
## Tiles project as diamonds: TILE_W wide, TILE_H tall. World coords are in tiles.

const TILE_W := 20.0
const TILE_H := 10.0

static func project(p: Vector2) -> Vector2:
	return Vector2((p.x - p.y) * TILE_W * 0.5, (p.x + p.y) * TILE_H * 0.5)

## Project a point raised `height` pixels above the ground plane.
static func project_lift(p: Vector2, height: float) -> Vector2:
	return project(p) - Vector2(0.0, height)

static func color(hex: String) -> Color:
	return Color.html(hex)

static func shade(col: Color, factor: float) -> Color:
	return Color(
		clampf(col.r * factor, 0.0, 1.0),
		clampf(col.g * factor, 0.0, 1.0),
		clampf(col.b * factor, 0.0, 1.0),
		col.a
	)

static func with_alpha(col: Color, a: float) -> Color:
	return Color(col.r, col.g, col.b, a)

static func hashstr(s: String) -> int:
	return abs(hash(s))