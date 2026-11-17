"""Build the R2C SOC room (Cypher / Sentinel / Patch) in Blender and export a GLB.

blender -b -P build_soc_room.py -- <tex_dir> <out.glb>

Blender metres, x east, y north, z up, floor top at z = 0, room centred on the
origin — the same frame socLayout.js measures in (ROOM_BOUNDS_M, partitions at
y = 0.18 and x = 0.42, Cypher's chair seat at (-1.05, -1.2) z 0.60). The south
wall is left open: the cameras stand there. No Cycles (the build host has no
AVX2): plain geometry + PBR/emissive materials, lit at runtime in three.js.
"""
import math, os, sys
import bpy

argv = sys.argv[sys.argv.index("--") + 1:]
TEX, OUT = argv[0], argv[1]

bpy.ops.wm.read_factory_settings(use_empty=True)
S = bpy.context.scene

# 2026-11-17 (Spencer: "the room is really too small"): the floor plan is
# 1.5x the original 4.85 x 5.21 m and the ceiling 3.0 m (was 2.70). The
# robots stay 1.70 m, and the furniture keeps its real size: each group
# (desk, chair, racks, bench...) is MOVED outward with the plan, never
# stretched, via shift() below. socLayout.js mirrors these numbers.
XMIN, XMAX, YMIN, YMAX, ZTOP = -3.64, 3.64, -3.91, 3.91, 3.00
# The cameras stand south of the robots' rooms: the room continues 3.6 m
# south of the layout so the wide shot can stand back.
SOUTH = YMIN - 3.6
HY, VX = 0.27, 0.63  # partitions
OLD_YMIN, OLD_YMAX = -2.605, 2.605  # the original plan, for wall-anchored groups

# ------------------------------------------------------------- materials
MATS = {}


def mat(name, color=(1, 1, 1), rough=0.5, metal=0.0, emit=None, strength=0.0, alpha=1.0, image=None, emit_image=None):
    if name in MATS:
        return MATS[name]
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if image:
        tn = nt.nodes.new("ShaderNodeTexImage")
        tn.image = bpy.data.images.load(os.path.join(TEX, image))
        nt.links.new(tn.outputs["Color"], b.inputs["Base Color"])
    if emit_image:
        tn = nt.nodes.new("ShaderNodeTexImage")
        tn.image = bpy.data.images.load(os.path.join(TEX, emit_image))
        nt.links.new(tn.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Base Color"].default_value = (0, 0, 0, 1)
        b.inputs["Emission Strength"].default_value = strength or 1.0
    elif emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = strength
    if alpha < 1.0:
        b.inputs["Alpha"].default_value = alpha
        for attr, val in (("surface_render_method", "BLENDED"), ("blend_method", "BLEND")):
            try:
                setattr(m, attr, val)
            except Exception:
                pass
    MATS[name] = m
    return m


def hexc(h):
    h = h.lstrip("#")
    srgb = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple((c / 12.92) if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4 for c in srgb)


M = {
    "Floor": mat("Floor", hexc("#E6EAF0"), rough=0.12),
    "FloorServer": mat("FloorServer", hexc("#BCC5D1"), rough=0.35, metal=0.2),
    "Wall": mat("Wall", hexc("#F2F4F7"), rough=0.6),
    "Ceiling": mat("Ceiling", hexc("#F5F6F8"), rough=0.75),
    "CeilingGrid": mat("CeilingGrid", hexc("#D5DAE1"), rough=0.6),
    "LightPanel": mat("LightPanel", (1, 1, 1), emit=(1, 1, 1), strength=4.0),
    "LED": mat("LED", hexc("#3B9BFF"), emit=hexc("#3B9BFF"), strength=8.0),
    "Glass": mat("Glass", hexc("#DCEBFF"), rough=0.04, alpha=0.14),
    "Frame": mat("Frame", hexc("#C3CAD4"), rough=0.28, metal=0.85),
    "DeskWhite": mat("DeskWhite", hexc("#F8FAFC"), rough=0.32),
    "Bezel": mat("Bezel", hexc("#0E1626"), rough=0.35, metal=0.3),
    "RackBody": mat("RackBody", hexc("#141A26"), rough=0.45, metal=0.35),
    "RackFront": mat("RackFront", emit_image="rack_front.png", strength=1.6),
    "ChairMesh": mat("ChairMesh", hexc("#D9DEE5"), rough=0.7),
    "ChairDark": mat("ChairDark", hexc("#2B3445"), rough=0.4, metal=0.4),
    "Plant": mat("Plant", hexc("#1F9D63"), rough=0.8),
    "Pot": mat("Pot", hexc("#F1F3F6"), rough=0.4),
    "PrinterWhite": mat("PrinterWhite", hexc("#DCE3EC"), rough=0.35),
    "BenchGrey": mat("BenchGrey", hexc("#E3E8EF"), rough=0.4),
    "PrinterGlow": mat("PrinterGlow", emit_image="printer_glow.png", strength=2.0),
    "Pegboard": mat("Pegboard", image="pegboard.png", rough=0.7),
    "Orange": mat("Orange", hexc("#F97316"), rough=0.45),
    "Teal": mat("Teal", hexc("#0EA5A4"), rough=0.45),
    "PanelDark": mat("PanelDark", hexc("#111827"), rough=0.3, metal=0.4),
    "Gold": mat("Gold", hexc("#E0B341"), rough=0.25, metal=1.0),
    "Book1": mat("Book1", hexc("#1E3A8A"), rough=0.7),
    "Book2": mat("Book2", hexc("#0F172A"), rough=0.7),
    "Book3": mat("Book3", hexc("#64748B"), rough=0.7),
    "Book4": mat("Book4", hexc("#0369A1"), rough=0.7),
}
SCREENS = ["screen_map.png", "screen_chart.png", "screen_code.png", "screen_shield.png", "screen_bars.png", "screen_chart2.png"]
for i, s in enumerate(SCREENS):
    M[f"Screen{i}"] = mat(f"Screen{i}", emit_image=s, strength=1.8)
M["WallDisplay"] = mat("WallDisplay", emit_image="wall_display.png", strength=1.8)


# ------------------------------------------------------------- primitives
# Plan offset applied to every primitive: a furniture group is authored at
# its original coordinates and moved as a unit with `with shift(dx, dy):`.
OFF = [0.0, 0.0]


class shift:
    def __init__(self, dx, dy):
        self.d = (dx, dy)

    def __enter__(self):
        OFF[0] += self.d[0]
        OFF[1] += self.d[1]

    def __exit__(self, *exc):
        OFF[0] -= self.d[0]
        OFF[1] -= self.d[1]


def at(x, y, z):
    """A location with the current group offset applied."""
    return (x + OFF[0], y + OFF[1], z)


def box(name, cx, cy, cz, sx, sy, sz, m, rz=0.0):
    """Axis box by centre + full size (metres)."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=at(cx, cy, cz))
    o = bpy.context.active_object
    o.name = name
    o.scale = (sx, sy, sz)
    o.rotation_euler[2] = rz
    o.data.materials.append(m)
    return o


def boxr(name, x0, x1, y0, y1, z0, z1, m):
    """Axis box by ranges."""
    return box(name, (x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2, abs(x1 - x0), abs(y1 - y0), abs(z1 - z0), m)


def cyl(name, cx, cy, z0, z1, r, m, verts=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=z1 - z0, location=at(cx, cy, (z0 + z1) / 2))
    o = bpy.context.active_object
    o.name = name
    o.data.materials.append(m)
    return o


def sphere(name, cx, cy, cz, r, m, sz=1.0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16, ring_count=10, radius=r, location=at(cx, cy, cz))
    o = bpy.context.active_object
    o.name = name
    o.scale[2] = sz
    o.data.materials.append(m)
    return o


def screen_plane(name, cx, cy, cz, w, h, m, facing):
    """A textured screen quad. facing: 'south' (-y), 'east' (+x)."""
    bpy.ops.mesh.primitive_plane_add(size=1, location=at(cx, cy, cz))
    o = bpy.context.active_object
    o.name = name
    o.scale = (w, h, 1)
    if facing == "south":
        o.rotation_euler = (math.pi / 2, 0, 0)
    elif facing == "east":
        o.rotation_euler = (math.pi / 2, 0, math.pi / 2)
    o.data.materials.append(m)
    return o


def plant(name, x, y, z, s=1.0):
    cyl(name + "Pot", x, y, z, z + 0.16 * s, 0.09 * s, M["Pot"])
    for i, (dx, dy, dz, r) in enumerate([(0, 0, 0.26, 0.13), (0.07, 0.03, 0.33, 0.09), (-0.06, -0.03, 0.31, 0.1), (0.0, 0.06, 0.38, 0.08)]):
        sphere(f"{name}Leaf{i}", x + dx * s, y + dy * s, z + dz * s, r * s, M["Plant"], sz=0.85)


# ------------------------------------------------------------- shell
boxr("Floor", XMIN - 0.1, XMAX + 0.1, SOUTH, YMAX + 0.1, -0.1, 0.0, M["Floor"])
boxr("FloorServer", XMIN + 0.02, VX - 0.02, HY + 0.02, YMAX - 0.02, 0.0, 0.006, M["FloorServer"])
boxr("WallW", XMIN - 0.1, XMIN, SOUTH, YMAX + 0.1, 0, ZTOP, M["Wall"])
boxr("WallE", XMAX, XMAX + 0.1, SOUTH, YMAX + 0.1, 0, ZTOP, M["Wall"])
boxr("WallN", XMIN - 0.1, XMAX + 0.1, YMAX, YMAX + 0.1, 0, ZTOP, M["Wall"])
boxr("Ceiling", XMIN - 0.1, XMAX + 0.1, SOUTH, YMAX + 0.1, ZTOP, ZTOP + 0.08, M["Ceiling"])

# Ceiling: recessed grid + linear light panels.
for i in range(-6, 7):
    x = i * 0.55
    boxr(f"CGridX{i}", x - 0.008, x + 0.008, SOUTH, YMAX, ZTOP - 0.01, ZTOP, M["CeilingGrid"])
for j in range(-13, 8):
    y = j * 0.55
    boxr(f"CGridY{j}", XMIN, XMAX, y - 0.008, y + 0.008, ZTOP - 0.01, ZTOP, M["CeilingGrid"])
for k, (x0, x1, y0, y1) in enumerate([
    (-1.9, -0.4, -3.95, -3.8), (0.4, 1.9, -3.95, -3.8),          # south extension
    (-1.9, -0.4, -2.85, -2.7), (0.4, 1.9, -2.85, -2.7),
    (-1.9, -0.4, -1.75, -1.6), (0.4, 1.9, -1.75, -1.6),          # desk room linear lights
    (-1.9, -0.4, -0.75, -0.6), (0.4, 1.9, -0.75, -0.6),
    (-2.0, -0.2, 1.3, 1.42), (0.7, 2.1, 1.3, 1.42),              # server room / workshop
]):
    boxr(f"LightPanel{k}", x0 * 1.5, x1 * 1.5, y0 * 1.5, y1 * 1.5, ZTOP - 0.025, ZTOP - 0.01, M["LightPanel"])

# Blue LED coves: along the ceiling edge of the three walls, and floor glow at the wall bases.
boxr("LEDCoveW", XMIN + 0.01, XMIN + 0.05, SOUTH, YMAX - 0.02, ZTOP - 0.06, ZTOP - 0.03, M["LED"])
boxr("LEDCoveE", XMAX - 0.05, XMAX - 0.01, SOUTH, YMAX - 0.02, ZTOP - 0.06, ZTOP - 0.03, M["LED"])
boxr("LEDCoveN", XMIN, XMAX, YMAX - 0.05, YMAX - 0.01, ZTOP - 0.06, ZTOP - 0.03, M["LED"])
boxr("LEDBaseW", XMIN + 0.005, XMIN + 0.02, SOUTH, YMAX, 0.01, 0.035, M["LED"])
boxr("LEDBaseE", XMAX - 0.02, XMAX - 0.005, SOUTH, YMAX, 0.01, 0.035, M["LED"])

# ------------------------------------------------------------- glass partitions
GLASS_TOP = ZTOP - 0.1


def glass_run(prefix, axis, fixed, start, end, mullions, doors):
    """A run of framed glass along x (axis='x', at y=fixed) or y (axis='y', at x=fixed)."""
    def seg_box(name, a0, a1, z0, z1, m, thick):
        if axis == "x":
            boxr(name, a0, a1, fixed - thick / 2, fixed + thick / 2, z0, z1, m)
        else:
            boxr(name, fixed - thick / 2, fixed + thick / 2, a0, a1, z0, z1, m)
    pts = sorted(set([start, end] + mullions))
    for i in range(len(pts) - 1):
        a0, a1 = pts[i], pts[i + 1]
        if any(abs(a0 - d0) < 1e-6 and abs(a1 - d1) < 1e-6 for d0, d1 in doors):
            # door opening: header only, plus a floor LED threshold
            seg_box(f"{prefix}Header{i}", a0, a1, GLASS_TOP, ZTOP, M["Frame"], 0.08)
            seg_box(f"{prefix}DoorLED{i}", a0, a1, 0.0, 0.012, M["LED"], 0.03)
            continue
        seg_box(f"{prefix}Pane{i}", a0, a1, 0.06, GLASS_TOP, M["Glass"], 0.016)
        seg_box(f"{prefix}Sill{i}", a0, a1, 0.0, 0.06, M["Frame"], 0.07)
        seg_box(f"{prefix}SillLED{i}", a0, a1, 0.06, 0.075, M["LED"], 0.02)
        seg_box(f"{prefix}Head{i}", a0, a1, GLASS_TOP, ZTOP, M["Frame"], 0.08)
        seg_box(f"{prefix}HeadLED{i}", a0, a1, GLASS_TOP - 0.02, GLASS_TOP, M["LED"], 0.02)
    for i, a in enumerate(pts):
        seg_box(f"{prefix}Mullion{i}", a - 0.015, a + 0.015, 0.0, ZTOP, M["Frame"], 0.06)


glass_run("GlassH", "x", HY, XMIN, XMAX, [-1.875, -0.15, VX, 1.425, 2.4], doors=[(1.425, 2.4)])
glass_run("GlassV", "y", VX, HY, YMAX, [1.65, 2.775], doors=[(2.775, YMAX)])
# Door access pad by the desk-room / workshop door.
boxr("DoorPad", 1.335, 1.395, HY - 0.06, HY - 0.035, 1.0, 1.22, M["PanelDark"])
boxr("DoorPadLED", 1.35, 1.38, HY - 0.065, HY - 0.06, 1.1, 1.16, M["LED"])

# ------------------------------------------------------------- Cypher's desk room
# Desk north of the chair, against the glass, monitors facing south (the camera).
# Desk, monitors and chair move as one group (sizes unchanged): chair seat at (-1.65, -1.11).
with shift(-0.6, HY - 0.18):
    D_Y0, D_Y1, D_TOP = -0.58, 0.06, 0.76
    boxr("DeskTop", -2.3, -0.1, D_Y0, D_Y1, D_TOP - 0.04, D_TOP, M["DeskWhite"])
    boxr("DeskPedW", -2.28, -1.78, D_Y0 + 0.02, D_Y1 - 0.02, 0.0, D_TOP - 0.04, M["DeskWhite"])
    boxr("DeskPedE", -0.62, -0.12, D_Y0 + 0.02, D_Y1 - 0.02, 0.0, D_TOP - 0.04, M["DeskWhite"])
    boxr("DeskModesty", -1.78, -0.62, D_Y1 - 0.06, D_Y1 - 0.03, 0.2, D_TOP - 0.04, M["DeskWhite"])
    boxr("DeskLEDTop", -2.3, -0.1, D_Y0 - 0.008, D_Y0, D_TOP - 0.035, D_TOP - 0.02, M["LED"])
    boxr("DeskLEDToeW", -2.28, -1.78, D_Y0 + 0.012, D_Y0 + 0.02, 0.01, 0.03, M["LED"])
    boxr("DeskLEDToeE", -0.62, -0.12, D_Y0 + 0.012, D_Y0 + 0.02, 0.01, 0.03, M["LED"])
    # Monitor bank: 2 rows x 3, screens face south.
    MON_W, MON_H = 0.56, 0.33
    cols = [-1.82, -1.21, -0.60]
    rows = [(D_TOP + 0.10, 0), (D_TOP + 0.10 + MON_H + 0.03, 3)]
    for r, (z0, base) in enumerate(rows):
        for c, x in enumerate(cols):
            yb = -0.12 - 0.02 * (1 - abs(c - 1))  # slight curve: outer screens forward
            boxr(f"MonBezel{r}{c}", x - MON_W / 2, x + MON_W / 2, yb, yb + 0.03, z0, z0 + MON_H, M["Bezel"])
            screen_plane(f"MonScreen{r}{c}", x, yb - 0.001, z0 + MON_H / 2, MON_W - 0.03, MON_H - 0.03, M[f"Screen{(base + c) % 6}"], "south")
    for x in cols:
        boxr(f"MonStand{x}", x - 0.025, x + 0.025, -0.08, -0.05, D_TOP, D_TOP + 0.12, M["ChairDark"])
    boxr("Keyboard", -1.45, -0.98, -0.5, -0.36, D_TOP, D_TOP + 0.018, M["Bezel"])
    boxr("Tablet1", -2.05, -1.85, -0.45, -0.3, D_TOP, D_TOP + 0.12, M["Bezel"])
    screen_plane("TabletScreen1", -1.95, -0.451, D_TOP + 0.065, 0.17, 0.1, M["Screen3"], "south")
    cyl("PenCup", -0.45, -0.4, D_TOP, D_TOP + 0.11, 0.04, M["ChairDark"])
    plant("DeskPlant", -0.3, -0.18, D_TOP, 0.9)

    # Cypher's office chair: seat top at 0.60 m (CYPHER_CHAIR_M), back to the north.
    CX, CY = -1.05, -1.2
    cyl("ChairSeat", CX, CY, 0.52, 0.60, 0.27, M["ChairMesh"], verts=32)
    boxr("ChairBack", CX - 0.24, CX + 0.24, CY + 0.28, CY + 0.34, 0.66, 1.28, M["ChairMesh"])
    boxr("ChairBackFrame", CX - 0.26, CX + 0.26, CY + 0.34, CY + 0.37, 0.64, 1.3, M["ChairDark"])
    boxr("ChairSpine", CX - 0.03, CX + 0.03, CY + 0.22, CY + 0.36, 0.5, 0.7, M["ChairDark"])
    for s in (-1, 1):
        boxr(f"ChairArm{s}", CX + s * 0.27 - 0.025, CX + s * 0.27 + 0.025, CY - 0.18, CY + 0.18, 0.78, 0.81, M["ChairDark"])
        boxr(f"ChairArmPost{s}", CX + s * 0.27 - 0.015, CX + s * 0.27 + 0.015, CY + 0.05, CY + 0.08, 0.58, 0.79, M["ChairDark"])
    cyl("ChairColumn", CX, CY, 0.1, 0.52, 0.03, M["ChairDark"])
    for i in range(5):
        a = i * 2 * math.pi / 5
        box(f"ChairLeg{i}", CX + 0.16 * math.cos(a), CY + 0.16 * math.sin(a), 0.07, 0.32, 0.04, 0.03, M["ChairDark"], rz=a)
        sphere(f"ChairCaster{i}", CX + 0.31 * math.cos(a), CY + 0.31 * math.sin(a), 0.03, 0.03, M["ChairDark"])

# West wall: the big R2C DATA CENTER display, a low credenza, and a bookcase.
# West-wall group, spread south with the plan.
with shift(0, -0.7):
    boxr("WallDisplayBezel", XMIN, XMIN + 0.04, -2.05, -0.75, 1.05, 1.86, M["Bezel"])
    bpy.ops.mesh.primitive_plane_add(size=1, location=at(XMIN + 0.041, -1.4, 1.455))
    o = bpy.context.active_object
    o.name = "WallDisplayScreen"
    o.scale = (1.26, 0.77, 1)
    o.rotation_euler = (math.pi / 2, 0, math.pi / 2)  # faces east (+x), into the room
    o.data.materials.append(M["WallDisplay"])
    boxr("Credenza", XMIN, XMIN + 0.36, -2.3, -0.75, 0.0, 0.62, M["DeskWhite"])
    boxr("CredenzaLED", XMIN + 0.36, XMIN + 0.368, -2.3, -0.75, 0.02, 0.04, M["LED"])
    plant("CredPlant1", XMIN + 0.18, -2.1, 0.62, 1.0)
    plant("CredPlant2", XMIN + 0.18, -0.95, 0.62, 0.8)
    cyl("TrophyBase", XMIN + 0.18, -1.55, 0.62, 0.66, 0.05, M["Bezel"])
    cyl("TrophyStem", XMIN + 0.18, -1.55, 0.66, 0.74, 0.012, M["Gold"])
    sphere("TrophyCup", XMIN + 0.18, -1.55, 0.79, 0.06, M["Gold"], sz=1.1)
    for i, (y0, y1, mm) in enumerate([(-1.45, -1.40, "Book1"), (-1.40, -1.36, "Book2"), (-1.36, -1.31, "Book4"), (-1.31, -1.27, "Book3"), (-1.27, -1.22, "Book1")]):
        boxr(f"CredBook{i}", XMIN + 0.08, XMIN + 0.28, y0, y1, 0.62, 0.62 + 0.2 + 0.02 * (i % 2), M[mm])
# Bookcase in the south-west corner.
# Bookcase stays in the south-west corner.
with shift(0, YMIN - OLD_YMIN):
    BC_X0, BC_X1, BC_Y0, BC_Y1 = XMIN, XMIN + 0.34, -2.6, -2.35
    for i, z in enumerate([0.0, 0.5, 1.0, 1.5, 2.0]):
        boxr(f"Shelf{i}", BC_X0, BC_X1, BC_Y0 - 0.3, BC_Y1, z, z + 0.03, M["DeskWhite"])
        boxr(f"ShelfLED{i}", BC_X0, BC_X1 - 0.02, BC_Y0 - 0.3, BC_Y1, z + 0.48, z + 0.49, M["LightPanel"]) if i < 4 else None
    boxr("ShelfSide", BC_X0, BC_X1, BC_Y1, BC_Y1 + 0.03, 0.0, 2.03, M["DeskWhite"])
    for i in range(4):
        z = 0.03 + i * 0.5
        for k in range(6):
            y0 = BC_Y0 - 0.28 + k * 0.05
            boxr(f"Book{i}{k}", BC_X0 + 0.05, BC_X0 + 0.27, y0, y0 + 0.035, z, z + 0.24 + 0.04 * ((i + k) % 3), M[["Book1", "Book2", "Book3", "Book4"][(i + k) % 4]])
    plant("ShelfPlant", BC_X0 + 0.17, BC_Y1 - 0.06, 1.53, 0.7)

# ------------------------------------------------------------- Sentinel's server room
# Racks along the north wall (spread west with the plan) and one on the
# west wall; all keep their real size and stand against their walls.
RACK_H = 2.05
RACK_Y0 = YMAX - 0.885  # rack front face, 0.835 m deep to the north wall
for i, x in enumerate([-2.65, -2.0, -1.35]):
    boxr(f"RackN{i}", x - 0.3, x + 0.3, RACK_Y0, YMAX - 0.05, 0.0, RACK_H, M["RackBody"])
    screen_plane(f"RackNFront{i}", x, RACK_Y0 - 0.001, RACK_H / 2, 0.54, RACK_H - 0.08, M["RackFront"], "south")
    boxr(f"RackNLED{i}", x - 0.3, x + 0.3, RACK_Y0 - 0.02, RACK_Y0, RACK_H - 0.04, RACK_H - 0.02, M["LED"])
# One rack on the west wall, front facing east.
boxr("RackW", XMIN + 0.02, XMIN + 0.82, 1.53, 2.13, 0.0, RACK_H, M["RackBody"])
bpy.ops.mesh.primitive_plane_add(size=1, location=at(XMIN + 0.821, 1.83, RACK_H / 2))
o = bpy.context.active_object
o.name = "RackWFront"
o.scale = (0.54, RACK_H - 0.08, 1)
o.rotation_euler = (math.pi / 2, 0, math.pi / 2)
o.data.materials.append(M["RackFront"])
# Cable tray above the racks.
boxr("CableTray", -3.0, -1.0, YMAX - 0.605, YMAX - 0.305, 2.3, 2.34, M["Frame"])

# ------------------------------------------------------------- Patch's workshop
# Bench along the east wall (real size, longer run for the bigger room).
B_X0, B_X1, B_Y0, B_Y1, B_TOP = XMAX - 0.605, XMAX - 0.02, 0.9, YMAX - 0.04, 0.9
boxr("BenchTop", B_X0, B_X1, B_Y0, B_Y1, B_TOP - 0.04, B_TOP, M["DeskWhite"])
boxr("BenchCab", B_X0 + 0.03, B_X1, B_Y0 + 0.02, B_Y1, 0.0, B_TOP - 0.04, M["BenchGrey"])
for k in range(4):
    z = 0.12 + k * 0.2
    boxr(f"Drawer{k}", B_X0 + 0.025, B_X0 + 0.03, B_Y0 + 0.08, B_Y1 - 0.08, z, z + 0.004, M["CeilingGrid"])
boxr("BenchLED", B_X0 - 0.006, B_X0, B_Y0, B_Y1, B_TOP - 0.035, B_TOP - 0.02, M["LED"])
# Two 3D printers on the bench, windows facing west (toward Patch).
for i, y in enumerate([1.3, 2.3]):
    x0, x1 = XMAX - 0.505, XMAX - 0.045
    boxr(f"Printer{i}Body", x0, x1, y - 0.24, y + 0.24, B_TOP, B_TOP + 0.52, M["PrinterWhite"])
    bpy.ops.mesh.primitive_plane_add(size=1, location=at(x0 - 0.001, y, B_TOP + 0.27))
    o = bpy.context.active_object
    o.name = f"Printer{i}Window"
    o.scale = (0.36, 0.36, 1)
    o.rotation_euler = (math.pi / 2, 0, -math.pi / 2)
    o.data.materials.append(M["PrinterGlow"])
    boxr(f"Printer{i}Top", x0, x1, y - 0.24, y + 0.24, B_TOP + 0.52, B_TOP + 0.56, M["PanelDark"])
    for k, (px, py) in enumerate([(x0, y - 0.24), (x0, y + 0.24), (x1, y - 0.24), (x1, y + 0.24)]):
        boxr(f"Printer{i}Post{k}", px - 0.015, px + 0.015, py - 0.015, py + 0.015, B_TOP, B_TOP + 0.56, M["PanelDark"])
    boxr(f"Printer{i}Base", x0, x1, y - 0.24, y + 0.24, B_TOP, B_TOP + 0.04, M["PanelDark"])
# Pegboard with tools, and a shelf above the bench.
bpy.ops.mesh.primitive_plane_add(size=1, location=at(XMAX - 0.011, 3.1, 1.45))
o = bpy.context.active_object
o.name = "Pegboard"
o.scale = (0.9, 0.62, 1)
o.rotation_euler = (math.pi / 2, 0, -math.pi / 2)
o.data.materials.append(M["Pegboard"])
boxr("PegboardFrame", XMAX - 0.03, XMAX - 0.01, 2.63, 3.57, 1.12, 1.15, M["Frame"])
boxr("WorkShelf", XMAX - 0.32, XMAX, 0.95, 2.6, 1.85, 1.88, M["DeskWhite"])
boxr("WorkShelfLED", XMAX - 0.32, XMAX - 0.02, 0.95, 2.6, 1.84, 1.85, M["LightPanel"])
for i, y in enumerate([1.1, 1.5, 1.9, 2.35]):
    boxr(f"Bin{i}", XMAX - 0.28, XMAX - 0.04, y - 0.1, y + 0.1, 1.88, 2.02, M[["Teal", "Orange", "Book4", "Teal"][i]])
plant("BenchPlant", XMAX - 0.3, YMAX - 0.3, B_TOP, 0.8)
# Toolbox on the floor, in the workshop's north-west corner area.
boxr("ToolboxBody", 2.0, 2.4, YMAX - 0.6, YMAX - 0.3, 0.0, 0.3, M["Orange"])
boxr("ToolboxLid", 2.0, 2.4, YMAX - 0.6, YMAX - 0.3, 0.3, 0.36, M["Teal"])
boxr("ToolboxHandle", 2.15, 2.25, YMAX - 0.47, YMAX - 0.43, 0.36, 0.4, M["ChairDark"])

# ------------------------------------------------------------- merge by material + export
bpy.ops.object.select_all(action="DESELECT")
by_mat = {}
for o in list(S.objects):
    if o.type == "MESH" and o.data.materials:
        by_mat.setdefault(o.data.materials[0].name, []).append(o)
for name, objs in by_mat.items():
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    if len(objs) > 1:
        bpy.ops.object.join()
    bpy.context.active_object.name = f"soc_{name}"
tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in S.objects if o.type == "MESH")
print("SOC ROOM objects", len([o for o in S.objects if o.type == 'MESH']), "tris", tris, flush=True)

kw = dict(filepath=OUT, export_format="GLB", export_apply=True, export_image_format="JPEG")
try:
    bpy.ops.export_scene.gltf(**kw, export_image_quality=88)
except TypeError:
    bpy.ops.export_scene.gltf(**kw)
print("WROTE", OUT, flush=True)
