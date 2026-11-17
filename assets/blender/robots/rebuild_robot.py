"""Rebuild a mission robot on a clean Meshy mesh, keeping its rig and clips.

blender -b -P rebuild_robot.py -- <rigged_old.glb> <new_mesh.glb> <out.glb> [target_tris] [tex_px]

Why (2026-11-17): the shipped robots (public/models/cypher.glb, ...) were
cut to 20,000 triangles with the old Collapse-only recipe, which split the
Meshy surface into hundreds of unwelded shells. They show as cracks on the
body. This script keeps everything that works -- the 24-bone rig, the six
clips (idle, walk, talk, point, greeting, thinking), the 1.70 m height --
and swaps in a clean mesh:

1. Import the rigged robot (armature + skinned mesh + clips) and the new,
   unrigged Meshy mesh.
2. Weld the new mesh's UV-split vertices (positions only; UVs are kept),
   and if it is above target_tris, decimate it gently (Collapse on the
   welded mesh, so shells cannot drift apart).
3. Fit the new mesh to the old one: same height (1.70 m), feet on z = 0,
   centred on the old body's x/y.
4. Copy the skin weights from the old body to the new one (nearest-face
   interpolation), keep at most 4 influences per vertex and normalise.
5. Bind the new body to the same armature, delete the old body, shrink the
   textures to tex_px, export a GLB with the armature and all clips.
"""
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
OLD, NEW, OUT = argv[0], argv[1], argv[2]
TARGET_TRIS = int(argv[3]) if len(argv) > 3 else 40000
TEX_PX = int(argv[4]) if len(argv) > 4 else 1024

bpy.ops.wm.read_factory_settings(use_empty=True)


def import_glb(path):
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=path)
    return [o for o in bpy.data.objects if o not in before]


def world_bbox(obj):
    pts = [obj.matrix_world @ Vector(c) for c in obj.bound_box]
    lo = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    hi = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    return lo, hi


def select_only(obj):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def tris(obj):
    return sum(len(p.vertices) - 2 for p in obj.data.polygons)


# --- 1. the rigged robot
old_objs = import_glb(OLD)
arm = next(o for o in old_objs if o.type == "ARMATURE")
old_body = next(o for o in old_objs if o.type == "MESH")
arm.data.pose_position = "REST"  # weights are copied in the bind pose
bpy.context.view_layer.update()
print("OLD", arm.name, old_body.name, "tris", tris(old_body), "actions", [a.name for a in bpy.data.actions], flush=True)

# --- 2. the new mesh
new_objs = import_glb(NEW)
new_meshes = [o for o in new_objs if o.type == "MESH"]
for o in new_objs:
    if o.type != "MESH":
        bpy.data.objects.remove(o, do_unlink=True)
if len(new_meshes) > 1:
    bpy.ops.object.select_all(action="DESELECT")
    for o in new_meshes:
        o.select_set(True)
    bpy.context.view_layer.objects.active = new_meshes[0]
    bpy.ops.object.join()
body = new_meshes[0]
body.parent = None
select_only(body)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
print("NEW", body.name, "tris", tris(body), flush=True)

bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.mesh.remove_doubles(threshold=0.00001)
bpy.ops.object.mode_set(mode="OBJECT")
if tris(body) > TARGET_TRIS:
    mod = body.modifiers.new("Slim", "DECIMATE")
    mod.decimate_type = "COLLAPSE"
    mod.ratio = TARGET_TRIS / tris(body)
    mod.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=mod.name)
    print("DECIMATED to", tris(body), flush=True)

# --- 3. fit to the old body
olo, ohi = world_bbox(old_body)
nlo, nhi = world_bbox(body)
s = (ohi.z - olo.z) / (nhi.z - nlo.z)
body.scale = (s, s, s)
bpy.context.view_layer.update()
nlo, nhi = world_bbox(body)
ocx, ocy = (olo.x + ohi.x) / 2, (olo.y + ohi.y) / 2
ncx, ncy = (nlo.x + nhi.x) / 2, (nlo.y + nhi.y) / 2
body.location = (body.location.x + ocx - ncx, body.location.y + ocy - ncy, body.location.z + olo.z - nlo.z)
bpy.context.view_layer.update()
select_only(body)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
nlo, nhi = world_bbox(body)
print("FIT scale %.4f old %s..%s new %s..%s" % (s, tuple(round(v, 3) for v in olo), tuple(round(v, 3) for v in ohi),
                                                tuple(round(v, 3) for v in nlo), tuple(round(v, 3) for v in nhi)), flush=True)

# --- 4. copy skin weights
for vg in old_body.vertex_groups:
    body.vertex_groups.new(name=vg.name)
dt = body.modifiers.new("Weights", "DATA_TRANSFER")
dt.object = old_body
dt.use_vert_data = True
dt.data_types_verts = {"VGROUP_WEIGHTS"}
dt.vert_mapping = "POLYINTERP_NEAREST"
dt.layers_vgroup_select_src = "ALL"
dt.layers_vgroup_select_dst = "NAME"
select_only(body)
bpy.ops.object.modifier_apply(modifier=dt.name)
bpy.ops.object.vertex_group_limit_total(group_select_mode="ALL", limit=4)
bpy.ops.object.vertex_group_normalize_all(group_select_mode="ALL", lock_active=False)
unweighted = sum(1 for v in body.data.vertices if not v.groups)
print("WEIGHTS groups", len(body.vertex_groups), "unweighted verts", unweighted, flush=True)

# --- 5. bind, clean up, textures, export
body.parent = arm
am = body.modifiers.new("Armature", "ARMATURE")
am.object = arm
body.name = old_body.name
bpy.data.objects.remove(old_body, do_unlink=True)
arm.data.pose_position = "POSE"

for img in bpy.data.images:
    if img.size[0] > TEX_PX:
        img.scale(TEX_PX, TEX_PX)

bpy.ops.object.select_all(action="SELECT")
kw = dict(filepath=OUT, export_format="GLB", export_skins=True, export_animations=True,
          export_animation_mode="ACTIONS", export_image_format="JPEG", export_apply=False)
try:
    bpy.ops.export_scene.gltf(**kw, export_image_quality=85)
except TypeError:
    bpy.ops.export_scene.gltf(**kw)
print("WROTE", OUT, "tris", tris(body), flush=True)
