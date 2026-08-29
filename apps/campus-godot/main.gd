extends Control

## Presentation plane: projects the campus state (campus -> buildings -> rooms ->
## agents) received from the core. Read-only for this slice; user commands come in
## a later layer. Connects to `CAMPUS_URL` (default ws://127.0.0.1:8787).
##
## Headless/CI: if `SHOT_PATH` is set, once a campus is projected it saves a PNG
## screenshot and quits (used for walkthrough artifacts).

const DEFAULT_URL := "ws://127.0.0.1:8787"
# preload (not the global class_name) so it resolves when run from the CLI without
# a prior editor import.
const CampusClientScript = preload("res://campus_client.gd")

var _client = CampusClientScript.new()
var _list: VBoxContainer
var _status: Label
var _shot_saved := false
var _frames_with_campus := 0

func _ready() -> void:
	var bg := ColorRect.new()
	bg.color = Color(0.07, 0.09, 0.13)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	var margin := MarginContainer.new()
	margin.set_anchors_preset(Control.PRESET_FULL_RECT)
	for side in ["left", "top", "right", "bottom"]:
		margin.add_theme_constant_override("margin_" + side, 24)
	add_child(margin)

	_list = VBoxContainer.new()
	_list.add_theme_constant_override("separation", 8)
	margin.add_child(_list)

	_status = Label.new()
	_status.add_theme_font_size_override("font_size", 12)
	_status.modulate = Color(0.55, 0.6, 0.7)
	_status.set_anchors_preset(Control.PRESET_BOTTOM_LEFT)
	_status.position = Vector2(24, 536)
	add_child(_status)

	_client.changed.connect(_rebuild)

	var url := OS.get_environment("CAMPUS_URL")
	if url == "":
		url = DEFAULT_URL
	_client.connect_to(url)
	_rebuild()

func _process(_dt: float) -> void:
	_client.poll()
	_maybe_screenshot()

func _rebuild() -> void:
	if _list == null:
		return
	for child in _list.get_children():
		_list.remove_child(child)
		child.free()

	var title := "Agent Campus — %s" % (_client.campus_name if _client.has_campus else "connecting…")
	_add_label(title, 26, Color(0.95, 0.96, 1.0))

	for b in _client.buildings:
		_add_label("🏢  %s" % b["name"], 19, Color(0.55, 0.78, 1.0), 10)
		for r in _client.rooms:
			if r["buildingId"] != b["id"]:
				continue
			var role_suffix := ("  ·  %s" % r["role"]) if r["role"] != "" else ""
			_add_label("      ▸  room: %s%s" % [r["key"], role_suffix], 15, Color(0.78, 0.84, 0.95), 6)
			for a in _client.agents:
				if a["roomId"] != r["id"]:
					continue
				_add_label("            •  %s%s" % [a["name"], _agent_meta(a)], 14, Color(0.62, 0.92, 0.72))

	if _status != null:
		_status.text = "core: %s   ·   %s" % [_ws_state_text(), _summary()]

func _agent_meta(a: Dictionary) -> String:
	var parts: Array = []
	if a["rankKey"] != "":
		parts.append(a["rankKey"])
	if a["skillKey"] != "":
		parts.append(a["skillKey"])
	return ("  (%s)" % ", ".join(parts)) if parts.size() > 0 else ""

func _summary() -> String:
	return "%d buildings · %d rooms · %d agents" % [_client.buildings.size(), _client.rooms.size(), _client.agents.size()]

func _ws_state_text() -> String:
	match _client.status():
		WebSocketPeer.STATE_OPEN:
			return "connected"
		WebSocketPeer.STATE_CONNECTING:
			return "connecting"
		_:
			return "offline"

func _add_label(text: String, size: int, color: Color, top_margin: int = 0) -> void:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	l.modulate = color
	if top_margin > 0:
		l.add_theme_constant_override("line_spacing", top_margin)
	_list.add_child(l)

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
