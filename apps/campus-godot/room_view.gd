class_name RoomView
extends RefCounted

## Modo Room — stub. Projects the rooms of each building as simple clay chips
## until the interior diorama lands (future mode). Read-only.

var BG := Color("#f0e6d4")
var INK := Color("#5b5342")
var INK_L := Color("#8a8170")

var _c: CampusClient
var _font: Font

func _init(client: CampusClient) -> void:
	_c = client
	_font = ThemeDB.fallback_font

func draw(nd: Node2D, vp: Vector2) -> void:
	nd.draw_rect(Rect2(Vector2.ZERO, vp), BG, true)
	if not _c.has_campus:
		_center_text(nd, vp * 0.5, "Connecting to core…", 18, INK_L)
		return
	_center_text(nd, Vector2(vp.x * 0.5, 64.0), "Room view — coming soon", 20, INK)
	var y := 120.0
	for b in _c.buildings:
		var bid := String(b.get("id", ""))
		var rooms: Array = []
		for r in _c.rooms:
			if String(r.get("buildingId", "")) == bid:
				rooms.append(r)
		_center_text(nd, Vector2(vp.x * 0.5, y), String(b.get("name", "")), 15, INK_L)
		y += 26.0
		var x := vp.x * 0.5 - 90.0
		for r in rooms:
			nd.draw_circle(Vector2(x + 10.0, y), 9.0, Color.html("#c9a97c"))
			nd.draw_string(_font, Vector2(x + 26.0, y + 4.0), String(r.get("key", "")), HORIZONTAL_ALIGNMENT_LEFT, -1, 13, INK)
			x += 60.0
		y += 40.0

func _center_text(nd: Node2D, center: Vector2, text: String, size: float, col: Color) -> void:
	var w := _font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
	nd.draw_string(_font, center + Vector2(-w * 0.5 + 1.5, 1.5), text, HORIZONTAL_ALIGNMENT_LEFT, -1, size, Color(0.0, 0.0, 0.0, 0.18))
	nd.draw_string(_font, center + Vector2(-w * 0.5, 0.0), text, HORIZONTAL_ALIGNMENT_LEFT, -1, size, col)