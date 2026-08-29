extends Node2D

## Presentation plane: a top-down map of the campus (aesthetic ref: pixel-art
## office interiors). Draws buildings as panels, rooms as floor tiles with walls +
## a header, and agents as sprites placed inside their room (leader in gold, a
## department head gets a blue ring). Read-only; commands come in a later layer.
##
## Connects to CAMPUS_URL (default ws://127.0.0.1:8787). If SHOT_PATH is set, saves
## a PNG once a campus is projected and quits (walkthrough artifacts).

const DEFAULT_URL := "ws://127.0.0.1:8787"
const CampusClientScript = preload("res://campus_client.gd")

const PAD := 24.0
const TITLE_H := 56.0
const B_HEADER_H := 30.0
const ROOM_W := 280.0
const ROOM_GAP := 16.0
const ROOM_HEADER_H := 28.0
const ROOM_PAD := 14.0
const AGENT_COLS := 2
const AGENT_CELL_W := 120.0
const AGENT_CELL_H := 48.0
const AGENT_R := 15.0

var _client = CampusClientScript.new()
var _font: Font
var _shot_saved := false
var _frames_with_campus := 0

func _ready() -> void:
	_font = ThemeDB.fallback_font
	_client.changed.connect(queue_redraw)
	var url := OS.get_environment("CAMPUS_URL")
	if url == "":
		url = DEFAULT_URL
	_client.connect_to(url)

func _process(_dt: float) -> void:
	_client.poll()
	_maybe_screenshot()

# --- layout helpers -------------------------------------------------------

func _rooms_of(bid: String) -> Array:
	var out: Array = []
	for r in _client.rooms:
		if String(r.get("buildingId", "")) == bid:
			out.append(r)
	return out

func _agents_of(rid: String) -> Array:
	var out: Array = []
	for a in _client.agents:
		if String(a.get("roomId", "")) == rid:
			out.append(a)
	return out

func _room_height(n: int) -> float:
	var rows: int = max(1, int(ceil(n / float(AGENT_COLS))))
	return ROOM_HEADER_H + rows * AGENT_CELL_H + ROOM_PAD

func _block_height(rooms: Array, avail_right: float) -> float:
	var x := PAD
	var y := 0.0
	var row_max := 0.0
	for r in rooms:
		var h := _room_height(_agents_of(String(r.get("id", ""))).size())
		if x + ROOM_W > avail_right and x > PAD:
			x = PAD
			y += row_max + ROOM_GAP
			row_max = 0.0
		row_max = max(row_max, h)
		x += ROOM_W + ROOM_GAP
	return y + row_max

func _heads() -> Dictionary:
	var d := {}
	for r in _client.rooms:
		var h := String(r.get("headAgentId", ""))
		if h != "":
			d[h] = true
	return d

# --- drawing --------------------------------------------------------------

func _draw() -> void:
	var vp := get_viewport_rect().size
	var vw := vp.x
	var vh := vp.y
	draw_rect(Rect2(0, 0, vw, vh), Color(0.09, 0.11, 0.16), true)

	var cname: String = _client.campus_name if _client.has_campus else "connecting…"
	draw_string(_font, Vector2(PAD, 36), "Agent Campus — %s" % cname, HORIZONTAL_ALIGNMENT_LEFT, -1, 24, Color(0.95, 0.96, 1.0))

	var heads := _heads()
	var avail_right := vw - PAD
	var y := TITLE_H
	for b in _client.buildings:
		var rooms := _rooms_of(String(b.get("id", "")))
		var block_h := _block_height(rooms, avail_right)
		draw_rect(Rect2(PAD - 10, y - 6, (vw - 2 * PAD) + 20, B_HEADER_H + block_h + 12), Color(0.12, 0.15, 0.21), true)
		_draw_building_icon(Vector2(PAD, y + 4))
		draw_string(_font, Vector2(PAD + 26, y + 20), String(b.get("name", "")), HORIZONTAL_ALIGNMENT_LEFT, -1, 18, Color(0.6, 0.8, 1.0))

		var x := PAD
		var ry := y + B_HEADER_H
		var row_max := 0.0
		for r in rooms:
			var agents := _agents_of(String(r.get("id", "")))
			var h := _room_height(agents.size())
			if x + ROOM_W > avail_right and x > PAD:
				x = PAD
				ry += row_max + ROOM_GAP
				row_max = 0.0
			_draw_room(Rect2(x, ry, ROOM_W, h), r, agents, heads)
			row_max = max(row_max, h)
			x += ROOM_W + ROOM_GAP
		y += B_HEADER_H + block_h + 22

	var status := "core: %s   ·   %d buildings · %d rooms · %d agents" % [_ws_state_text(), _client.buildings.size(), _client.rooms.size(), _client.agents.size()]
	draw_string(_font, Vector2(PAD, vh - 14), status, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, Color(0.5, 0.55, 0.65))

func _draw_building_icon(p: Vector2) -> void:
	draw_rect(Rect2(p.x, p.y, 18, 16), Color(0.55, 0.78, 1.0), true)
	for wx in [3, 8, 13]:
		for wy in [3, 8]:
			draw_rect(Rect2(p.x + wx, p.y + wy, 3, 3), Color(0.12, 0.15, 0.21), true)

func _draw_room(rect: Rect2, r: Dictionary, agents: Array, heads: Dictionary) -> void:
	var is_leader := String(r.get("role", "")) == "leader"
	var floor_col := Color(0.24, 0.19, 0.10) if is_leader else Color(0.16, 0.19, 0.25)
	var header_col := Color(0.30, 0.24, 0.13) if is_leader else Color(0.20, 0.24, 0.31)
	draw_rect(rect, floor_col, true)
	draw_rect(Rect2(rect.position, Vector2(rect.size.x, ROOM_HEADER_H)), header_col, true)
	draw_rect(rect, Color(0.34, 0.38, 0.46), false, 2.0)

	var role := String(r.get("role", ""))
	var label := "room: %s" % String(r.get("key", ""))
	if role != "":
		label += "   · " + role
	draw_string(_font, rect.position + Vector2(10, 19), label, HORIZONTAL_ALIGNMENT_LEFT, -1, 14, Color(0.85, 0.88, 0.95))

	var ax0 := rect.position.x + ROOM_PAD
	var ay0 := rect.position.y + ROOM_HEADER_H + 8
	for i in agents.size():
		var a: Dictionary = agents[i]
		var col := i % AGENT_COLS
		var row := i / AGENT_COLS
		var cx := ax0 + col * AGENT_CELL_W + AGENT_R
		var cy := ay0 + row * AGENT_CELL_H + AGENT_R
		_draw_agent(Vector2(cx, cy), a, heads.has(String(a.get("id", ""))))

func _draw_agent(c: Vector2, a: Dictionary, is_head: bool) -> void:
	var is_leader := String(a.get("rankKey", "")) == "leader"
	if is_head:
		draw_circle(c, AGENT_R + 3.0, Color(0.42, 0.62, 1.0))
	var body := Color(0.95, 0.75, 0.30) if is_leader else Color(0.30, 0.78, 0.55)
	draw_circle(c, AGENT_R, body)
	draw_circle(c + Vector2(-5, -4), 2.5, Color(0.10, 0.12, 0.16))
	draw_circle(c + Vector2(5, -4), 2.5, Color(0.10, 0.12, 0.16))

	var tx := c.x + AGENT_R + 8
	draw_string(_font, Vector2(tx, c.y - 1), String(a.get("name", "")), HORIZONTAL_ALIGNMENT_LEFT, -1, 13, Color(0.96, 0.97, 1.0))
	var meta := _agent_meta(a)
	if meta != "":
		draw_string(_font, Vector2(tx, c.y + 13), meta, HORIZONTAL_ALIGNMENT_LEFT, -1, 11, Color(0.62, 0.68, 0.78))

func _agent_meta(a: Dictionary) -> String:
	var parts: Array = []
	if String(a.get("rankKey", "")) != "":
		parts.append(String(a.get("rankKey", "")))
	if String(a.get("skillKey", "")) != "":
		parts.append(String(a.get("skillKey", "")))
	return ", ".join(parts) if parts.size() > 0 else ""

func _ws_state_text() -> String:
	match _client.status():
		WebSocketPeer.STATE_OPEN:
			return "connected"
		WebSocketPeer.STATE_CONNECTING:
			return "connecting"
		_:
			return "offline"

func _maybe_screenshot() -> void:
	var shot := OS.get_environment("SHOT_PATH")
	if shot == "" or _shot_saved or not _client.has_campus:
		return
	_frames_with_campus += 1
	if _frames_with_campus < 4:
		return
	await RenderingServer.frame_post_draw
	var img := get_viewport().get_texture().get_image()
	img.save_png(shot)
	_shot_saved = true
	print("saved screenshot to: ", shot)
	get_tree().quit()
