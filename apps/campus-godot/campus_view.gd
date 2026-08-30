class_name CampusView
extends RefCounted

## Clay isometric diorama of the campus (modo Campus). Pure projection of the
## core state replayed by CampusClient; no business logic lives here.
##
## Look: soft clay maquette on a cream diorama (ref: assets/refs/
## aesthetic-campus-isometric-clay.png). Buildings are dimetric boxes whose
## three faces are shaded from the entity's skin palette (042); trees, paths
## and the population are procedural but deterministic (hash of ids).

const Iso = preload("res://iso.gd")

var BG := Color("#f6eddc")
var GRASS := Color("#b1d9a4")
var GRASS_D := Color("#a3cc95")
var SAND := Color("#ecd0a5")
var SAND_D := Color("#d3b184")
var INK := Color("#5b5342")
var INK_L := Color("#8a8170")
var SKIN_TONE := Color("#ecc59c")
var TRUNK := Color("#a98463")
var LEAF := Color("#8fbf6f")
var LEAF_L := Color("#a9d58a")
var FALLBACK_PAL := {"floor": Color("#e0cfae"), "wall": Color("#cdb79e"), "header": Color("#efe0c2"), "accent": Color("#9c815d")}

var _c: CampusClient
var _font: Font
var _offset := Vector2.ZERO

func _init(client: CampusClient) -> void:
	_c = client
	_font = ThemeDB.fallback_font

func draw(nd: Node2D, vp: Vector2) -> void:
	nd.draw_rect(Rect2(Vector2.ZERO, vp), BG, true)
	if not _c.has_campus:
		_center_text(nd, vp * 0.5, "Connecting to core…", 18, INK_L)
		return
	var entries := _entries()
	if entries.is_empty():
		_center_text(nd, vp * 0.5, "empty campus", 18, INK_L)
		return
	_compute_offset(entries, vp)
	var items: Array = []  # [{sum, kind, data}]
	var trees_root: Array = []  # flat tree positions, drawn before buildings if far
	var bound_min := Vector2(INF, INF)
	var bound_max := Vector2(-INF, -INF)
	for e in entries:
		_grow(bound_min, bound_max, _foot_world_min(e))
		_grow(bound_min, bound_max, _foot_world_max(e))
		items.append({ "sum": e["sum"], "kind": "build", "data": e })
		for t in _trees_of(e):
			trees_root.append(t)
			_grow(bound_min, bound_max, _tree_world(t))
	_draw_grass(nd, bound_min, bound_max)
	_draw_paths(nd, entries)
	_place_trees(items, trees_root)
	_draw_ordered(items, nd)
	for e in entries:
		_draw_signs(nd, e)
	_draw_legend(nd, vp)

# --- entry assembly -----------------------------------------------------------

func _entries() -> Array:
	var out: Array = []
	for i in _c.buildings.size():
		var b: Dictionary = _c.buildings[i]
		var e := _entry(b, i)
		if e != {}:
			out.append(e)
	return out

func _entry(b: Dictionary, i: int) -> Dictionary:
	var app: Dictionary = {}
	var a = b.get("appearance", {})
	if typeof(a) == TYPE_DICTIONARY:
		app = a
	var bid := String(b.get("id", ""))
	var skin := _skin(String(app.get("skinKey", "")), "building")
	var fw := 4.0
	var fh := 3.0
	var sz = skin.get("size", {})
	if typeof(sz) == TYPE_DICTIONARY:
		fw = maxf(2.5, _f(sz.get("w", 4), 4.0) * 0.5)
		fh = maxf(2.5, _f(sz.get("h", 3), 3.0) * 0.5)
	var bx := float(2 + (i % 3) * 8)
	var by := float(2 + (i / 3) * 8)
	var vx = app.get("x", null)
	var vy = app.get("y", null)
	if vx != null:
		bx = float(vx)
	if vy != null:
		by = float(vy)
	var pal := _palette(skin)
	var agents: Array = []
	for ag in _c.agents:
		if String(ag.get("buildingId", "")) == bid:
			agents.append(ag)
	return {
		"bid": bid,
		"name": String(b.get("name", "")),
		"bx": bx,
		"by": by,
		"fw": fw,
		"fh": fh,
		"H": (fw + fh) * 4.0,
		"pal": pal,
		"agents": agents,
		"sum": bx + fw * 0.5 + by + fh * 0.5,
		"hash": Iso.hashstr(bid),
	}

# --- geometry helpers ---------------------------------------------------------

func _skin(key: String, kind: String) -> Dictionary:
	if key == "":
		return {}
	for s in _c.skins:
		if String(s.get("kind", "")) == kind and String(s.get("key", "")) == key:
			return s
	return {}

func _palette(skin: Dictionary) -> Dictionary:
	if skin.is_empty():
		return FALLBACK_PAL
	var p = skin.get("palette", {})
	if typeof(p) != TYPE_DICTIONARY or p.is_empty():
		return FALLBACK_PAL
	var out := {}
	for k in ["floor", "wall", "header", "accent"]:
		var hex: String = String(p.get(k, ""))
		if hex != "":
			out[k] = Iso.color(hex)
	return out if not out.is_empty() else FALLBACK_PAL

func _f(v, def: float) -> float:
	if typeof(v) == TYPE_INT or typeof(v) == TYPE_FLOAT:
		return float(v)
	return def

func _foot_world_min(e: Dictionary) -> Vector2:
	return Vector2(e["bx"], e["by"])

func _foot_world_max(e: Dictionary) -> Vector2:
	return Vector2(e["bx"] + e["fw"], e["by"] + e["fh"])

func _tree_world(t: Dictionary) -> Vector2:
	return t["pos"]

func _grow(mn: Vector2, mx: Vector2, p: Vector2) -> void:
	mn.x = minf(mn.x, p.x)
	mn.y = minf(mn.y, p.y)
	mx.x = maxf(mx.x, p.x)
	mx.y = maxf(mx.y, p.y)

func _compute_offset(entries: Array, vp: Vector2) -> void:
	var cx := 0.0
	var cy := 0.0
	for e in entries:
		cx += e["bx"] + e["fw"] * 0.5
		cy += e["by"] + e["fh"] * 0.5
	cx /= float(entries.size())
	cy /= float(entries.size())
	var target := Vector2(vp.x * 0.5, vp.y * 0.5 + 18.0)
	_offset = target - Iso.project(Vector2(cx, cy))

func _w(p: Vector2) -> Vector2:
	return Iso.project(p) + _offset

func _wl(p: Vector2, h: float) -> Vector2:
	return Iso.project_lift(p, h) + _offset

# --- decoration ---------------------------------------------------------------

func _trees_of(e: Dictionary) -> Array:
	var out: Array = []
	var n: int = 2 + int(e["hash"]) % 2
	var spots: Array = [
		Vector2(e["bx"] - 2.2, e["by"] - 1.0),
		Vector2(e["bx"] + e["fw"] + 1.6, e["by"] - 1.4),
		Vector2(e["bx"] - 1.6, e["by"] + e["fh"] + 0.8),
		Vector2(e["bx"] + e["fw"] + 2.0, e["by"] + e["fh"] + 0.2),
	]
	for i in n:
		var pos: Vector2 = spots[i % spots.size()]
		out.append({ "pos": pos, "seed": e["hash"] + i })
	return out

func _place_trees(items: Array, trees: Array) -> void:
	for t in trees:
		items.append({ "sum": t["pos"].x + t["pos"].y, "kind": "tree", "data": t })

# --- ground -------------------------------------------------------------------

func _draw_grass(nd: Node2D, mn: Vector2, mx: Vector2) -> void:
	var x0 := int(floorf(mn.x)) - 4
	var x1 := int(ceilf(mx.x)) + 4
	var y0 := int(floorf(mn.y)) - 4
	var y1 := int(ceilf(mx.y)) + 4
	for wx in range(x0, x1 + 1):
		for wy in range(y0, y1 + 1):
			var col: Color = GRASS if (wx + wy) % 2 == 0 else GRASS_D
			var q := PackedVector2Array([
				_w(Vector2(float(wx), float(wy))),
				_w(Vector2(float(wx + 1), float(wy))),
				_w(Vector2(float(wx + 1), float(wy + 1))),
				_w(Vector2(float(wx), float(wy + 1))),
			])
			nd.draw_polygon(q, [col])

func _draw_paths(nd: Node2D, entries: Array) -> void:
	if entries.size() < 2:
		return
	for i in entries.size() - 1:
		var a: Dictionary = entries[i]
		var bb: Dictionary = entries[i + 1]
		var p0: Vector2 = Vector2(a["bx"] + a["fw"] * 0.5, a["by"] + a["fh"])
		var p1: Vector2 = Vector2(bb["bx"] + bb["fw"] * 0.5, bb["by"] + bb["fh"])
		var m: Vector2 = (p0 + p1) * 0.5
		var dir := p1 - p0
		var perp := Vector2(-dir.y, dir.x)
		if perp.length() > 0.0:
			perp = perp.normalized()
		var bend: float = 1.2 + float(int(a["hash"] + bb["hash"]) % 3) * 0.6
		var mid: Vector2 = m + perp * bend
		for seg in [ [p0, mid], [mid, p1] ]:
			var from: Vector2 = _w(seg[0])
			var to: Vector2 = _w(seg[1])
			nd.draw_line(from, to, SAND_D, 9.0, true)
			nd.draw_line(from, to, SAND, 5.5, true)

# --- ordered objects ----------------------------------------------------------

func _draw_ordered(items: Array, nd: Node2D) -> void:
	items.sort_custom(func(x, y): return x["sum"] < y["sum"])
	for it in items:
		if it["kind"] == "build":
			_draw_building(nd, it["data"])
		else:
			_draw_tree(nd, it["data"])

func _draw_building(nd: Node2D, e: Dictionary) -> void:
	var c0: Vector2 = _w(Vector2(e["bx"], e["by"]))
	var c1: Vector2 = _w(Vector2(e["bx"] + e["fw"], e["by"]))
	var c2: Vector2 = _w(Vector2(e["bx"] + e["fw"], e["by"] + e["fh"]))
	var c3: Vector2 = _w(Vector2(e["bx"], e["by"] + e["fh"]))
	var H: float = e["H"]
	var t0: Vector2 = c0 + Vector2(0.0, -H)
	var t1: Vector2 = c1 + Vector2(0.0, -H)
	var t2: Vector2 = c2 + Vector2(0.0, -H)
	var t3: Vector2 = c3 + Vector2(0.0, -H)
	var pal: Dictionary = e["pal"]
	var wall: Color = pal["wall"]
	var header: Color = pal["header"]
	var accent: Color = pal["accent"]
	var center: Vector2 = Vector2(e["bx"] + e["fw"] * 0.5, e["by"] + e["fh"] * 0.5)
	# Soft drop shadow on the grass.
	var sc: Vector2 = _w(center) + Vector2(7.0, 12.0)
	var radius: Vector2 = Vector2(e["fw"] + e["fh"], (e["fw"] + e["fh"]) * 0.45)
	nd.draw_ellipse(sc, (radius * 2.2).x, (radius * 2.2).y, Iso.with_alpha(INK, 0.10), true)
	nd.draw_ellipse(sc, (radius * 1.5).x, (radius * 1.5).y, Iso.with_alpha(INK, 0.12), true)
	# Three faces (painter-safe: drawn after the grass, before later items).
	nd.draw_polygon(PackedVector2Array([c2, c1, t1, t2]), [Iso.shade(wall, 0.78)])
	nd.draw_polygon(PackedVector2Array([c0, c3, t3, t0]), [Iso.shade(wall, 0.94)])
	nd.draw_polygon(PackedVector2Array([c1, c0, t0, t1]), [Iso.shade(wall, 0.62)])
	# Roof (top face), slightly beveled.
	nd.draw_polygon(PackedVector2Array([t0, t1, t2, t3]), [header])
	var inset := 0.14
	nd.draw_polygon(PackedVector2Array([
		_lerp4(t0, t1, t2, t3, inset, inset),
		_lerp4(t0, t1, t2, t3, 1.0 - inset, inset),
		_lerp4(t0, t1, t2, t3, 1.0 - inset, 1.0 - inset),
		_lerp4(t0, t1, t2, t3, inset, 1.0 - inset),
	]), [Color(1.0, 1.0, 1.0, 0.22)])
	nd.draw_polyline(PackedVector2Array([t0, t1, t2, t3, t0]), Iso.shade(header, 0.6), 1.5, true)
	# Door on the near-right face (accent).
	var s0: Vector2 = c1.lerp(c2, 0.62)
	var s1: Vector2 = c1.lerp(c2, 0.8)
	var top0: Vector2 = s0 + Vector2(0.0, -H * 0.4)
	var top1: Vector2 = s1 + Vector2(0.0, -H * 0.4)
	nd.draw_polygon(PackedVector2Array([s0, s1, top1, top0]), [accent])
	_draw_people(nd, e)

func _lerp4(a: Vector2, b: Vector2, c: Vector2, d: Vector2, fx: float, fy: float) -> Vector2:
	var top: Vector2 = a.lerp(b, fx)
	var bottom: Vector2 = d.lerp(c, fx)
	return top.lerp(bottom, fy)

func _draw_tree(nd: Node2D, t: Dictionary) -> void:
	var p: Vector2 = _w(t["pos"])
	var seed: int = int(t["seed"])
	nd.draw_ellipse(p + Vector2(3.0, 5.0), 7.0, 4.0, Iso.with_alpha(INK, 0.10), true)
	nd.draw_rect(Rect2(p + Vector2(-1.5, -6.0), Vector2(3.0, 6.0)), Iso.shade(TRUNK, 0.9))
	nd.draw_circle(p + Vector2(0.0, -8.0), 6.5, LEAF)
	nd.draw_circle(p + Vector2(1.5, -9.5), 4.2, LEAF_L)
	if seed % 3 == 0:
		nd.draw_circle(p + Vector2(-2.0, -10.0), 1.6, Color.html("#f0c987"))

func _draw_people(nd: Node2D, e: Dictionary) -> void:
	var agents: Array = e["agents"]
	var n := agents.size()
	if n == 0:
		return
	var accent: Color = e["pal"]["accent"]
	var base: Vector2 = Vector2(e["bx"] + e["fw"] * 0.5 - float(n - 1) * 0.7, e["by"] + e["fh"] + 0.5)
	for i in n:
		var a: Dictionary = agents[i]
		var wp: Vector2 = base + Vector2(i * 1.4, 0.0)
		var p: Vector2 = _w(wp)
		nd.draw_ellipse(p + Vector2(1.5, 2.5), 3.5, 2.0, Iso.with_alpha(INK, 0.12), true)
		nd.draw_circle(p, 3.4, accent)
		nd.draw_circle(p + Vector2(0.0, -4.2), 2.4, SKIN_TONE)
		if _c.is_live(String(a.get("id", ""))):
			nd.draw_circle(p + Vector2(-4.2, -2.0), 1.4, Color.html("#3f9d5b"))

func _draw_signs(nd: Node2D, e: Dictionary) -> void:
	var cx: Vector2 = Vector2(e["bx"] + e["fw"] * 0.5, e["by"] + e["fh"] * 0.5)
	_center_text(nd, _wl(cx, e["H"] + 12.0), String(e["name"]), 15, INK)
	var agents: Array = e["agents"]
	if not agents.is_empty():
		var bc: Vector2 = _wl(Vector2(e["bx"] + e["fw"] * 0.8, e["by"] + e["fh"] * 0.62), e["H"]) + Vector2(11.0, -10.0)
		nd.draw_circle(bc, 11.0, Color(1.0, 1.0, 1.0, 0.96))
		nd.draw_arc(bc, 11.0, 0.0, TAU, 24, Iso.with_alpha(INK, 0.35), 1.5, true)
		_center_text(nd, bc - Vector2(0.0, 3.0), str(agents.size()), 14, INK)
		var liven := 0
		for a in agents:
			if _c.is_live(String(a.get("id", ""))):
				liven += 1
		if liven > 0:
			_center_text(nd, bc + Vector2(0.0, 10.0), "%d live" % liven, 10, Color.html("#3f9d5b"))

func _draw_legend(nd: Node2D, vp: Vector2) -> void:
	var text := "%d buildings · %d rooms · %d agents" % [_c.buildings.size(), _c.rooms.size(), _c.agents.size()]
	nd.draw_string(_font, Vector2(20.0, vp.y - 14.0), text, HORIZONTAL_ALIGNMENT_LEFT, -1, 12, INK_L)

func _center_text(nd: Node2D, center: Vector2, text: String, size: float, col: Color) -> void:
	var w := _font.get_string_size(text, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
	nd.draw_string(_font, center + Vector2(-w * 0.5 + 1.5, 1.5), text, HORIZONTAL_ALIGNMENT_LEFT, -1, size, Iso.with_alpha(INK, 0.25))
	nd.draw_string(_font, center + Vector2(-w * 0.5, 0.0), text, HORIZONTAL_ALIGNMENT_LEFT, -1, size, col)