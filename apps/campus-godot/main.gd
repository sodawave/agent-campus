extends Node2D

## Presentation plane (Godot) — projects the campus core state via CampusClient.
## Modes: "campus" (clay isometric diorama) and "room" (stub). The client is the
## only owner of state reduction; this shell only selects a view and draws HUD.
##
## Env: CAMPUS_URL (default ws://127.0.0.1:8787), CAMPUS_MODE (campus|room),
## SHOT_PATH (save one PNG once campus is projected, then quit).

const DEFAULT_URL := "ws://127.0.0.1:8787"
const CampusClientScript = preload("res://campus_client.gd")
const CampusViewScript = preload("res://campus_view.gd")
const RoomViewScript = preload("res://room_view.gd")

var _client: CampusClient = CampusClientScript.new()
var _views: Dictionary = {}
var _mode := "campus"
var _font: Font
var _shot_saved := false
var _frames_with_campus := 0

func _ready() -> void:
	_font = ThemeDB.fallback_font
	_client.changed.connect(queue_redraw)
	_views["campus"] = CampusViewScript.new(_client)
	_views["room"] = RoomViewScript.new(_client)
	var m := OS.get_environment("CAMPUS_MODE")
	if m == "room":
		_mode = "room"
	var url := OS.get_environment("CAMPUS_URL")
	if url == "":
		url = DEFAULT_URL
	_client.connect_to(url)

func _unhandled_input(ev: InputEvent) -> void:
	if ev is InputEventKey and ev.pressed and not ev.echo and ev.keycode == KEY_TAB:
		_mode = "room" if _mode == "campus" else "campus"
		queue_redraw()

func _process(_dt: float) -> void:
	_client.poll()
	_maybe_screenshot()

func _draw() -> void:
	var vp := get_viewport_rect().size
	var view = _views.get(_mode)
	if view != null:
		view.draw(self, vp)
	_draw_hud(vp)

func _draw_hud(vp: Vector2) -> void:
	var cname: String = _client.campus_name if _client.has_campus else "connecting…"
	var title := "Agent Campus — %s" % cname
	nd_draw_string(Vector2(16.0, 28.0), title, 20, Color.html("#5b5342"))
	var pill := "mode: %s   [Tab]" % _mode
	var pw := _font.get_string_size(pill, HORIZONTAL_ALIGNMENT_LEFT, -1, 13).x
	var pill_pos := Vector2(vp.x - pw - 18.0, 20.0)
	nd_draw_string(pill_pos + Vector2(1.0, 1.0), pill, 13, Color(0.0, 0.0, 0.0, 0.15))
	nd_draw_string(pill_pos, pill, 13, Color.html("#8a8170"))
	var status := "core: %s · %d buildings · %d rooms · %d agents · %d workers · %d projects · %d tasks" % [_ws_state_text(), _client.buildings.size(), _client.rooms.size(), _client.agents.size(), _client.workers.size(), _client.projects.size(), _client.tasks.size()]
	nd_draw_string(Vector2(16.0, vp.y - 12.0), status, 11, Color.html("#8a8170"))

func nd_draw_string(pos: Vector2, text: String, size: float, col: Color) -> void:
	draw_string(_font, Vector2(pos.x + 1.5, pos.y + 1.5), text, HORIZONTAL_ALIGNMENT_LEFT, -1, size, Color(1.0, 1.0, 1.0, 0.85))
	draw_string(_font, pos, text, HORIZONTAL_ALIGNMENT_LEFT, -1, size, col)

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