"""Build Cypher (Road to CISSP Cyber Missions Phase 2, Milestone B).

REMODEL (2026-11-13): re-proportioned to match the approved art — big helmet
head with a wide black digital face, large cyan-ringed ear discs, big shield
chest emblem, thicker limbs, open gesturing right hand, holographic shield
tablet held up in the left hand. Same 26-bone rig, same 6 clips, same 1.70 m.

Pure procedural Blender modeling from the approved character sheets — no Meshy,
no purchased assets. Run headless:

    blender --background --python build_cypher.py -- --out <dir>

Outputs (in <out>):
    cypher.blend   editable source (this scene, saved after building)
    cypher.glb     glTF 2.0 export (skinned by bone parenting, 6 animation clips)
    cypher-front.png / cypher-side.png / cypher-back.png   EEVEE renders
    frames/        animation preview frames (walk clip) for ffmpeg assembly

Scale: metric metres. Origin at the floor between the feet. The model faces -Y
in Blender (glTF forward +Z after export). Total height 1.70 m (handle top).
Palette (from the approved sheet): white #FFFFFF, navy #0D1B2A,
cyan emissive #00E5FF, blue #1E90FF, panel #BFD6E6.

Rig: one armature, 26 bones (same names/structure as Phase 2). Meshes are RIGID parts parented to bones
(parent_type='BONE') — correct for a robot, no weight painting needed.
Clips (separate NLA strips, exported as named GLB animations):
    idle (2.0s loop), walk (1.0s loop), talk (1.6s loop),
    point (1.2s one-shot), greeting (1.2s one-shot), thinking (1.6s loop)
"""

import argparse
import math
import os
import sys

import bpy
from mathutils import Vector, Matrix

# ---------------------------------------------------------------- palette
WHITE = (1.0, 1.0, 1.0, 1.0)
NAVY = (0.051, 0.106, 0.165, 1.0)      # #0D1B2A
CYAN = (0.0, 0.898, 1.0, 1.0)          # #00E5FF
BLUE = (0.118, 0.565, 1.0, 1.0)        # #1E90FF
PANEL = (0.749, 0.839, 0.902, 1.0)     # #BFD6E6
FACE = (0.02, 0.04, 0.07, 1.0)         # near-black face screen
SOLE = (0.03, 0.05, 0.08, 1.0)

FPS = 30


# ---------------------------------------------------------------- helpers
def make_material(name, color, roughness=0.4, metallic=0.05, emission=None, emission_strength=0.0):
    mat = bpy.data.materials.get(name)
    if mat is None:
        mat = bpy.data.materials.new(name)
        mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Base Color"].default_value = color
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    if emission is not None:
        bsdf.inputs["Emission Color"].default_value = (*emission[:3], 1.0)
        bsdf.inputs["Emission Strength"].default_value = emission_strength
    return mat


def assign(obj, mat):
    if obj.data and hasattr(obj.data, "materials"):
        obj.data.materials.append(mat)


def bevel(obj, width=0.01, segments=2):
    mod = obj.modifiers.new("bevel", "BEVEL")
    mod.width = width
    mod.segments = segments
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.modifier_apply(modifier=mod.name)


def box(name, loc, dims, mat, bevel_w=0.008):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel_w:
        bevel(obj, bevel_w, 2)
    if mat:
        assign(obj, mat)
    return obj


def cyl(name, loc, radius, depth, mat, rot=(0, 0, 0), vertices=32):
    bpy.ops.mesh.primitive_cylinder_add(radius=radius, depth=depth, vertices=vertices, location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        assign(obj, mat)
    return obj


def sphere(name, loc, scale, mat, segments=32, rings=16):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc)
    obj = bpy.context.active_object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if mat:
        assign(obj, mat)
    return obj


def torus(name, loc, major, minor, mat, rot=(0, 0, 0), major_seg=32, minor_seg=12):
    bpy.ops.mesh.primitive_torus_add(
        major_radius=major, minor_radius=minor,
        major_segments=major_seg, minor_segments=minor_seg,
        location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    if mat:
        assign(obj, mat)
    return obj


def arc(name, loc, radius, tube, start_deg, end_deg, mat, rot=(0, 0, 0)):
    """A partial torus (an arc) — used for the happy eyes and smile."""
    bpy.ops.mesh.primitive_torus_add(
        major_radius=radius, minor_radius=tube,
        major_segments=24, minor_segments=8,
        location=loc, rotation=rot)
    obj = bpy.context.active_object
    obj.name = name
    # Delete the unwanted arc span by bisecting the mesh: keep angles start..end.
    # Torus vertices are ordered around the ring; simplest robust approach is to
    # build the arc from a curve instead — see curve_arc below.
    bpy.data.objects.remove(obj, do_unlink=True)
    return curve_arc(name, loc, radius, tube, start_deg, end_deg, mat, rot)


def curve_arc(name, loc, radius, tube, start_deg, end_deg, mat, rot):
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = tube
    curve.bevel_resolution = 3
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(3)
    a0, a1 = math.radians(start_deg), math.radians(end_deg)
    angles = [a0 + (a1 - a0) * t / 3 for t in range(4)]
    for bp, ang in zip(spline.bezier_points, angles):
        # Arc in the local XY plane, centred at the origin.
        bp.co = (radius * math.cos(ang), radius * math.sin(ang), 0.0)
        bp.handle_left_type = "AUTO"
        bp.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = rot
    if mat:
        obj.data.materials.append(mat)
    return obj


def join(objects, name):
    bpy.ops.object.select_all(action="DESELECT")
    for obj in objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = objects[0]
    bpy.ops.object.join()
    joined = bpy.context.active_object
    joined.name = name
    return joined


def parent_to_bone(obj, armature, bone_name):
    # Parent via the operator: it computes matrix_parent_inverse correctly.
    # (Manual formula is wrong for bones — Blender's bone-parent matrix is
    # built from the bone TAIL, not from pose_bone.matrix, which is head-based.)
    # The armature must be the active object for parent_set(type="BONE").
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    armature.select_set(True)
    bpy.context.view_layer.objects.active = armature
    armature.data.bones.active = armature.data.bones[bone_name]
    bpy.ops.object.parent_set(type="BONE")
    bpy.ops.object.select_all(action="DESELECT")


# ---------------------------------------------------------------- build
def shield_mesh(name, width, height, depth, mat, loc=(0, 0, 0), rot=(0, 0, 0)):
    """A shield plate from a closed poly-spline outline, extruded and converted
    to a mesh. Built in the local XY plane (width x height), extruded along
    local +Z. Caller sets the final matrix (e.g. facing -Y with rot X +90)."""
    pts = [(-0.5, 0.5), (0.5, 0.5), (0.5, 0.15), (0.42, -0.15), (0.25, -0.38),
           (0.0, -0.5), (-0.25, -0.38), (-0.42, -0.15), (-0.5, 0.15)]
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
    spline = curve.splines.new("POLY")
    spline.points.add(len(pts) - 1)
    for p, (x, y) in zip(spline.points, pts):
        p.co = (x * width, y * height, 0.0, 1.0)
    spline.use_cyclic_u = True
    curve.extrude = depth / 2.0  # Blender 4.0 renamed extrude_depth -> extrude
    curve.bevel_depth = 0.003
    curve.bevel_resolution = 1
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = loc
    obj.rotation_euler = rot
    if mat:
        obj.data.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.active_object
    obj.name = name
    return obj


def rotate_about(obj, pivot, rot_xyz):
    """Rotate obj about a world pivot point by Euler angles (radians)."""
    R = (Matrix.Rotation(rot_xyz[0], 4, "X")
         @ Matrix.Rotation(rot_xyz[1], 4, "Y")
         @ Matrix.Rotation(rot_xyz[2], 4, "Z"))
    M = Matrix.Translation(Vector(pivot)) @ R @ Matrix.Translation(-Vector(pivot))
    obj.matrix_world = M @ obj.matrix_world
    bpy.context.view_layer.update()


def build_model():
    # Clean scene.
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()
    for coll in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.armatures):
        pass  # materials are recreated by name below; meshes die with objects

    mat_white = make_material("ArmorWhite", WHITE, roughness=0.35, metallic=0.05)
    mat_navy = make_material("JointNavy", NAVY, roughness=0.5, metallic=0.25)
    mat_blue = make_material("PanelBlue", BLUE, roughness=0.4, metallic=0.1)
    mat_panel = make_material("PanelGrey", PANEL, roughness=0.45, metallic=0.1)
    mat_face = make_material("FaceScreen", FACE, roughness=0.15, metallic=0.1)
    mat_cyan = make_material("CyanGlow", CYAN, roughness=0.3, metallic=0.0,
                             emission=CYAN, emission_strength=2.0)
    mat_sole = make_material("SoleDark", SOLE, roughness=0.7, metallic=0.1)

    parts = {}  # name -> object, for bone parenting

    # --- Head: BIG rounded helmet (centre ~1.45 m), wide black face ---
    # Shell is wider than the torso: in the art the head is ~as wide as the
    # chest, ~28% of total height.
    head = sphere("head_shell", (0, 0, 1.45), (0.24, 0.21, 0.175), mat_white, segments=48, rings=24)
    parts["head_shell"] = head
    # Navy cap on the top-back of the helmet (the dark stripe in the art).
    cap = sphere("navy_cap", (0, 0.03, 1.585), (0.20, 0.185, 0.075), mat_navy, segments=24, rings=12)
    parts["navy_cap"] = cap
    # Face screen: a second ellipsoid, slightly larger in Y (forward) than the
    # shell, so its dark front pokes out across the whole face — a wide black
    # digital face, not a visor slit. Spans ~x ±0.19, z ±0.135.
    face = sphere("face_screen", (0, -0.025, 1.45), (0.225, 0.215, 0.155), mat_face, segments=48, rings=24)
    parts["face_screen"] = face
    # Happy eyes: big upward arcs + a small smile, just proud of the screen.
    eye_rot = (math.pi / 2, 0, 0)
    eye_l = curve_arc("face_eye_L", (-0.085, -0.225, 1.48), 0.045, 0.012, 15, 165, mat_cyan, eye_rot)
    eye_r = curve_arc("face_eye_R", (0.085, -0.225, 1.48), 0.045, 0.012, 15, 165, mat_cyan, eye_rot)
    smile = curve_arc("face_smile", (0, -0.225, 1.40), 0.035, 0.009, 200, 340, mat_cyan, eye_rot)
    parts["face_eye_L"] = eye_l
    parts["face_eye_R"] = eye_r
    parts["face_smile"] = smile
    # Ear discs: LARGE, tilted ~25 deg toward the front so the cyan rings
    # read from the front view too (not just the side), protruding past the
    # head silhouette. Right ear tilts -25 deg about Z, left ear +25 deg.
    for side, sx in (("L", -1), ("R", 1)):
        tilt = math.radians(-25 * sx)
        y_rot = math.pi / 2 if sx > 0 else -math.pi / 2
        ear = cyl(f"ear_disc_{side}", (sx * 0.245, 0, 1.45), 0.095, 0.05, mat_white, rot=(0, y_rot, tilt), vertices=24)
        ring = torus(f"ear_ring_{side}", (sx * 0.272, 0, 1.45), 0.068, 0.009, mat_cyan, rot=(0, y_rot, tilt))
        hub = cyl(f"ear_hub_{side}", (sx * 0.274, 0, 1.45), 0.032, 0.014, mat_navy, rot=(0, y_rot, tilt), vertices=20)
        dot = cyl(f"ear_dot_{side}", (sx * 0.276, 0, 1.45), 0.012, 0.016, mat_cyan, rot=(0, y_rot, tilt), vertices=12)
        parts[f"ear_disc_{side}"] = ear
        parts[f"ear_ring_{side}"] = ring
        parts[f"ear_hub_{side}"] = hub
        parts[f"ear_dot_{side}"] = dot
    # Carry handle across the top of the head, with a cyan light strip.
    handle = torus("head_handle", (0, 0, 1.615), 0.11, 0.022, mat_white, rot=(math.pi / 2, 0, 0))
    handle.scale = (1.0, 1.0, 0.55)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    handle_light = box("head_handle_light", (0, 0, 1.638), (0.12, 0.02, 0.012), mat_cyan, bevel_w=0.004)
    parts["head_handle"] = handle
    parts["head_handle_light"] = handle_light

    # --- Neck (short, dark, cyan ring) ---
    neck = cyl("neck", (0, 0, 1.27), 0.06, 0.10, mat_navy, vertices=20)
    parts["neck"] = neck
    neck_ring = torus("neck_ring", (0, 0, 1.29), 0.062, 0.006, mat_cyan, rot=(0, 0, 0))
    parts["neck_ring"] = neck_ring

    # --- Torso: layered chest plate, navy side panels, BIG shield emblem ---
    torso = box("torso_shell", (0, 0, 1.02), (0.46, 0.30, 0.42), mat_white, bevel_w=0.03)
    parts["torso_shell"] = torso
    chest_plate = box("chest_plate", (0, -0.13, 1.06), (0.40, 0.06, 0.34), mat_white, bevel_w=0.02)
    parts["chest_plate"] = chest_plate
    for side, sx in (("L", -1), ("R", 1)):
        light = box(f"chest_light_{side}", (sx * 0.13, -0.162, 1.17), (0.06, 0.008, 0.015), mat_cyan, bevel_w=0.003)
        side_panel = box(f"side_panel_{side}", (sx * 0.225, 0, 1.02), (0.02, 0.20, 0.30), mat_navy, bevel_w=0.004)
        parts[f"chest_light_{side}"] = light
        parts[f"side_panel_{side}"] = side_panel
    # Shield emblem: cyan outline shield slightly larger and behind a navy
    # shield plate, with a small cyan padlock in the centre — the art's chest.
    shield_outline = shield_mesh("chest_shield_outline", 0.21, 0.25, 0.006, mat_cyan,
                                 loc=(0, -0.156, 1.08), rot=(math.pi / 2, 0, 0))
    shield_plate = shield_mesh("chest_shield", 0.18, 0.22, 0.012, mat_navy,
                               loc=(0, -0.162, 1.08), rot=(math.pi / 2, 0, 0))
    lock_body = box("chest_lock_body", (0, -0.172, 1.075), (0.035, 0.01, 0.045), mat_cyan, bevel_w=0.003)
    lock_shackle = torus("chest_lock_shackle", (0, -0.172, 1.11), 0.016, 0.004, mat_cyan, rot=(math.pi / 2, 0, 0))
    parts["chest_shield_outline"] = shield_outline
    parts["chest_shield"] = shield_plate
    parts["chest_lock_body"] = lock_body
    parts["chest_lock_shackle"] = lock_shackle
    # Back vent: three thin slats on the upper back.
    for i, z in enumerate((1.16, 1.13, 1.10)):
        vent = box(f"back_vent_{i}", (0, 0.152, z), (0.12, 0.008, 0.012), mat_panel, bevel_w=0.002)
        parts[f"back_vent_{i}"] = vent
    # Waist band (navy) + pelvis.
    waist = box("waist", (0, 0, 0.88), (0.36, 0.26, 0.10), mat_navy, bevel_w=0.02)
    parts["waist"] = waist
    hip = box("hip", (0, 0, 0.80), (0.34, 0.26, 0.20), mat_white, bevel_w=0.025)
    parts["hip"] = hip

    # --- Arms: thicker limbs, big shoulder pads, open hands ---
    # Rest pose is neutral (arms hang); the animations do the gesturing.
    for side, sx in (("L", -1), ("R", 1)):
        pad = sphere(f"shoulder_pad_{side}", (sx * 0.27, 0, 1.20), (0.11, 0.11, 0.095), mat_white, segments=24, rings=12)
        stripe = box(f"shoulder_stripe_{side}", (sx * 0.27, -0.02, 1.28), (0.11, 0.012, 0.02), mat_blue, bevel_w=0.004)
        upper = cyl(f"upper_arm_{side}", (sx * 0.33, 0, 1.075), 0.075, 0.25, mat_white, vertices=20)
        elbow = sphere(f"elbow_{side}", (sx * 0.33, 0, 0.95), (0.075, 0.075, 0.075), mat_navy, segments=16, rings=8)
        parts[f"shoulder_pad_{side}"] = pad
        parts[f"shoulder_stripe_{side}"] = stripe
        parts[f"upper_arm_{side}"] = upper
        parts[f"elbow_{side}"] = elbow
    # Right forearm hangs straight down (as before).
    fore_r = cyl("forearm_R", (0.33, 0, 0.83), 0.07, 0.24, mat_white, vertices=20)
    fore_stripe_r = box("forearm_stripe_R", (0.33, -0.072, 0.83), (0.035, 0.008, 0.16), mat_cyan, bevel_w=0.003)
    wrist_r = cyl("wrist_R", (0.33, 0, 0.71), 0.05, 0.05, mat_navy, vertices=16)
    palm_r = sphere("hand_palm_R", (0.33, 0, 0.665), (0.06, 0.045, 0.075), mat_navy, segments=16, rings=8)
    parts["forearm_R"] = fore_r
    parts["forearm_stripe_R"] = fore_stripe_r
    parts["wrist_R"] = wrist_r
    parts["hand_palm_R"] = palm_r
    # Right hand OPEN and gesturing: flattened palm + four fanned fingers + thumb.
    for i, (dx, spread) in enumerate(((-0.05, -32), (-0.017, -11), (0.017, 11), (0.05, 32))):
        finger = sphere(f"hand_finger_R{i}", (0.33 + dx, -0.01, 0.595),
                        (0.02, 0.02, 0.05), mat_navy, segments=16, rings=8)
        finger.rotation_euler = (0, 0, math.radians(spread))
        bpy.context.view_layer.update()
        parts[f"hand_finger_R{i}"] = finger
    thumb_r = sphere("hand_thumb_R", (0.285, -0.02, 0.66), (0.02, 0.02, 0.04), mat_navy, segments=16, rings=8)
    thumb_r.rotation_euler = (0, 0, math.radians(50))
    bpy.context.view_layer.update()
    parts["hand_thumb_R"] = thumb_r
    # Left forearm is BENT forward ~40 deg at the elbow (mesh-level bend, so
    # the rest pose holds the tablet up at chest height like the art).
    elbow_l = Vector((-0.33, 0, 0.93))
    bend = (math.radians(-40), 0, 0)
    fore_l = cyl("forearm_L", (-0.33, 0, 0.93), 0.07, 0.26, mat_white, vertices=20)
    rotate_about(fore_l, elbow_l, bend)
    parts["forearm_L"] = fore_l
    # Cyan stripe on the bent forearm: same bend applied to its offset.
    R_bend = Matrix.Rotation(bend[0], 4, "X")
    stripe_l_loc = elbow_l + R_bend @ Vector((0, -0.072, -0.13))
    fore_stripe_l = box("forearm_stripe_L", stripe_l_loc, (0.035, 0.008, 0.16), mat_cyan, bevel_w=0.003)
    fore_stripe_l.rotation_euler = bend
    bpy.context.view_layer.update()
    parts["forearm_stripe_L"] = fore_stripe_l
    wrist_l_loc = elbow_l + R_bend @ Vector((0, 0, -0.22))
    wrist_l = cyl("wrist_L", wrist_l_loc, 0.05, 0.05, mat_navy, rot=bend, vertices=16)
    parts["wrist_L"] = wrist_l
    palm_l_loc = elbow_l + R_bend @ Vector((0, 0, -0.27))
    palm_l = sphere("hand_palm_L", palm_l_loc, (0.06, 0.045, 0.075), mat_navy, segments=16, rings=8)
    palm_l.rotation_euler = bend
    bpy.context.view_layer.update()
    parts["hand_palm_L"] = palm_l

    # --- Legs (slimmer, wider stance, cyan knee strips + ankle rings) ---
    for side, sx in (("L", -1), ("R", 1)):
        thigh = box(f"thigh_{side}", (sx * 0.13, 0, 0.65), (0.16, 0.15, 0.32), mat_white, bevel_w=0.02)
        thigh_glow = cyl(f"thigh_glow_{side}", (sx * 0.13, -0.078, 0.65), 0.032, 0.012, mat_cyan, rot=(math.pi / 2, 0, 0), vertices=16)
        knee = cyl(f"knee_{side}", (sx * 0.13, 0, 0.48), 0.07, 0.10, mat_navy, rot=(0, math.pi / 2, 0), vertices=20)
        knee_strip = box(f"knee_strip_{side}", (sx * 0.13, -0.072, 0.48), (0.03, 0.01, 0.11), mat_cyan, bevel_w=0.003)
        shin = box(f"shin_{side}", (sx * 0.13, 0, 0.29), (0.15, 0.14, 0.34), mat_white, bevel_w=0.02)
        shin_panel = box(f"shin_panel_{side}", (sx * 0.208, 0, 0.29), (0.012, 0.08, 0.18), mat_navy, bevel_w=0.004)
        ankle = cyl(f"ankle_{side}", (sx * 0.13, 0, 0.10), 0.05, 0.07, mat_navy, vertices=16)
        ankle_ring = torus(f"ankle_ring_{side}", (sx * 0.13, 0, 0.10), 0.055, 0.007, mat_cyan, rot=(0, 0, 0))
        foot = box(f"foot_{side}", (sx * 0.13, -0.03, 0.035), (0.16, 0.26, 0.07), mat_white, bevel_w=0.015)
        sole = box(f"foot_sole_{side}", (sx * 0.13, -0.03, 0.008), (0.16, 0.26, 0.016), mat_sole, bevel_w=0.004)
        parts[f"thigh_{side}"] = thigh
        parts[f"thigh_glow_{side}"] = thigh_glow
        parts[f"knee_{side}"] = knee
        parts[f"knee_strip_{side}"] = knee_strip
        parts[f"shin_{side}"] = shin
        parts[f"shin_panel_{side}"] = shin_panel
        parts[f"ankle_{side}"] = ankle
        parts[f"ankle_ring_{side}"] = ankle_ring
        parts[f"foot_{side}"] = foot
        parts[f"foot_sole_{side}"] = sole

    # --- Holographic shield tablet (left hand, held up at chest height) ---
    tablet = box("tablet", (-0.38, -0.26, 0.88), (0.26, 0.012, 0.36), None, bevel_w=0.006)
    tab_mat = make_material("TabletGlass", (0.01, 0.06, 0.16, 1.0), roughness=0.2, metallic=0.1,
                            emission=CYAN, emission_strength=0.5)
    tab_mat.use_nodes = True
    bsdf = tab_mat.node_tree.nodes.get("Principled BSDF")
    bsdf.inputs["Alpha"].default_value = 0.85
    try:
        tab_mat.surface_render_method = "DITHERED"
    except Exception:
        pass
    assign(tablet, tab_mat)
    tablet.rotation_euler = (math.radians(-18), 0, math.radians(8))
    bpy.context.view_layer.update()
    parts["tablet"] = tablet
    # Face details, placed in tablet-local space (x=width, y=thickness,
    # z=height; the face is the -Y side). The shield needs its plane on the
    # tablet face, so it gets an extra +90 deg about local X.
    tab_mw = tablet.matrix_world.copy()
    R_tab = tab_mw.to_3x3().to_4x4()

    def tab_world(lx, ly, lz):
        return tab_mw @ Vector((lx, ly, lz))

    def tab_place(obj, lx, ly, lz, extra_rot_x=0.0):
        M = (Matrix.Translation(tab_world(lx, ly, lz))
             @ R_tab @ Matrix.Rotation(extra_rot_x, 4, "X"))
        obj.matrix_world = M
        bpy.context.view_layer.update()

    tab_shield = shield_mesh("tab_shield", 0.13, 0.16, 0.004, mat_cyan)
    tab_place(tab_shield, 0, -0.010, 0.07, extra_rot_x=math.pi / 2)
    parts["tab_shield"] = tab_shield
    tab_lock = box("tab_lock", (0, 0, 0), (0.02, 0.008, 0.025), mat_cyan, bevel_w=0.003)
    tab_place(tab_lock, 0, -0.016, 0.07)
    parts["tab_lock"] = tab_lock
    for i, (bx, bh) in enumerate(((-0.075, 0.04), (-0.025, 0.065), (0.025, 0.05), (0.075, 0.075))):
        bar = box(f"tab_bar_{i}", (0, 0, 0), (0.026, 0.008, bh), mat_cyan, bevel_w=0.002)
        tab_place(bar, bx, -0.010, -0.16 + bh / 2)
        parts[f"tab_bar_{i}"] = bar
    # Left fingers curled around the tablet's lower-left edge.
    for i, (fx, fy, fz) in enumerate(((-0.485, -0.27, 0.74), (-0.465, -0.275, 0.72), (-0.445, -0.27, 0.705))):
        gf = sphere(f"hand_grip_L{i}", (fx, fy, fz), (0.015, 0.015, 0.03), mat_navy, segments=16, rings=8)
        gf.rotation_euler = (0, 0.3, 0.5)
        bpy.context.view_layer.update()
        parts[f"hand_grip_L{i}"] = gf
    thumb_l = sphere("hand_thumb_L", (-0.40, -0.24, 0.70), (0.015, 0.015, 0.032), mat_navy, segments=16, rings=8)
    thumb_l.rotation_euler = (0, 0, math.radians(-40))
    bpy.context.view_layer.update()
    parts["hand_thumb_L"] = thumb_l

    return parts

# ---------------------------------------------------------------- rig
BONES = [
    # name, head (x, y, z), tail (x, y, z), parent
    ("root", (0, 0, 0.0), (0, 0, 0.10), None),
    ("hips", (0, 0, 0.82), (0, 0, 0.95), "root"),
    ("spine", (0, 0, 0.95), (0, 0, 1.10), "hips"),
    ("chest", (0, 0, 1.10), (0, 0, 1.24), "spine"),
    ("neck", (0, 0, 1.24), (0, 0, 1.30), "chest"),
    ("head", (0, 0, 1.30), (0, 0, 1.58), "neck"),
    ("eye.L", (-0.085, -0.225, 1.48), (-0.085, -0.225, 1.53), "head"),
    ("eye.R", (0.085, -0.225, 1.48), (0.085, -0.225, 1.53), "head"),
    ("shoulder.L", (-0.27, 0, 1.22), (-0.33, 0, 1.22), "chest"),
    ("upper_arm.L", (-0.33, 0, 1.22), (-0.33, 0, 0.93), "shoulder.L"),
    ("elbow.L", (-0.33, 0, 0.93), (-0.33, 0, 0.71), "upper_arm.L"),
    ("wrist.L", (-0.33, 0, 0.71), (-0.33, 0, 0.60), "elbow.L"),
    ("hand.L", (-0.33, 0, 0.60), (-0.33, 0, 0.55), "wrist.L"),
    ("shoulder.R", (0.27, 0, 1.22), (0.33, 0, 1.22), "chest"),
    ("upper_arm.R", (0.33, 0, 1.22), (0.33, 0, 0.93), "shoulder.R"),
    ("elbow.R", (0.33, 0, 0.93), (0.33, 0, 0.71), "upper_arm.R"),
    ("wrist.R", (0.33, 0, 0.71), (0.33, 0, 0.60), "elbow.R"),
    ("hand.R", (0.33, 0, 0.60), (0.33, 0, 0.55), "wrist.R"),
    ("thigh.L", (-0.13, 0, 0.82), (-0.13, 0, 0.48), "hips"),
    ("knee.L", (-0.13, 0, 0.48), (-0.13, 0, 0.10), "thigh.L"),
    ("ankle.L", (-0.13, 0, 0.10), (-0.13, 0, 0.02), "knee.L"),
    ("foot.L", (-0.13, 0, 0.02), (-0.13, -0.08, 0.02), "ankle.L"),
    ("thigh.R", (0.13, 0, 0.82), (0.13, 0, 0.48), "hips"),
    ("knee.R", (0.13, 0, 0.48), (0.13, 0, 0.10), "thigh.R"),
    ("ankle.R", (0.13, 0, 0.10), (0.13, 0, 0.02), "knee.R"),
    ("foot.R", (0.13, 0, 0.02), (0.13, -0.08, 0.02), "ankle.R"),
]

# mesh name -> bone (rigid part parenting)
PART_BONES = {
    "head_shell": "head", "face_screen": "head", "navy_cap": "head",
    "face_eye_L": "eye.L", "face_eye_R": "eye.R", "face_smile": "head",
    "ear_disc_L": "head", "ear_ring_L": "head", "ear_hub_L": "head", "ear_dot_L": "head",
    "ear_disc_R": "head", "ear_ring_R": "head", "ear_hub_R": "head", "ear_dot_R": "head",
    "head_handle": "head", "head_handle_light": "head",
    "neck": "neck", "neck_ring": "neck",
    "torso_shell": "chest", "chest_plate": "chest",
    "chest_light_L": "chest", "chest_light_R": "chest",
    "side_panel_L": "chest", "side_panel_R": "chest",
    "chest_shield_outline": "chest", "chest_shield": "chest",
    "chest_lock_body": "chest", "chest_lock_shackle": "chest",
    "back_vent_0": "chest", "back_vent_1": "chest", "back_vent_2": "chest",
    "waist": "hips", "hip": "hips",
    "shoulder_pad_L": "shoulder.L", "shoulder_stripe_L": "shoulder.L",
    "upper_arm_L": "upper_arm.L",
    "elbow_L": "elbow.L",
    "forearm_L": "elbow.L", "forearm_stripe_L": "elbow.L",
    "wrist_L": "wrist.L", "hand_palm_L": "hand.L",
    "hand_grip_L0": "hand.L", "hand_grip_L1": "hand.L", "hand_grip_L2": "hand.L",
    "hand_thumb_L": "hand.L",
    "shoulder_pad_R": "shoulder.R", "shoulder_stripe_R": "shoulder.R",
    "upper_arm_R": "upper_arm.R",
    "elbow_R": "elbow.R",
    "forearm_R": "elbow.R", "forearm_stripe_R": "elbow.R",
    "wrist_R": "wrist.R", "hand_palm_R": "hand.R",
    "hand_finger_R0": "hand.R", "hand_finger_R1": "hand.R",
    "hand_finger_R2": "hand.R", "hand_finger_R3": "hand.R",
    "hand_thumb_R": "hand.R",
    "thigh_L": "thigh.L", "thigh_glow_L": "thigh.L",
    "knee_L": "knee.L", "knee_strip_L": "knee.L",
    "shin_L": "knee.L", "shin_panel_L": "knee.L",
    "ankle_L": "ankle.L", "ankle_ring_L": "ankle.L",
    "foot_L": "foot.L", "foot_sole_L": "foot.L",
    "thigh_R": "thigh.R", "thigh_glow_R": "thigh.R",
    "knee_R": "knee.R", "knee_strip_R": "knee.R",
    "shin_R": "knee.R", "shin_panel_R": "knee.R",
    "ankle_R": "ankle.R", "ankle_ring_R": "ankle.R",
    "foot_R": "foot.R", "foot_sole_R": "foot.R",
    "tablet": "hand.L", "tab_shield": "hand.L", "tab_lock": "hand.L",
    "tab_bar_0": "hand.L", "tab_bar_1": "hand.L", "tab_bar_2": "hand.L", "tab_bar_3": "hand.L",
}

def build_rig(parts):
    bpy.ops.object.armature_add(enter_editmode=True, location=(0, 0, 0))
    arm = bpy.context.active_object
    arm.name = "CypherRig"
    arm.show_in_front = True
    # Remove the default bone, then add ours.
    bpy.ops.armature.select_all(action="SELECT")
    bpy.ops.armature.delete()
    edit_bones = arm.data.edit_bones
    created = {}
    for name, head, tail, parent in BONES:
        bone = edit_bones.new(name)
        bone.head = head
        bone.tail = tail
        if parent:
            bone.parent = created[parent]
            bone.use_connect = False
        created[name] = bone
    bpy.ops.object.mode_set(mode="OBJECT")
    # Parent each part rigidly to its bone.
    for part_name, bone_name in PART_BONES.items():
        obj = parts.get(part_name)
        if obj is None:
            print(f"WARNING: part {part_name} missing, skipping bone parent")
            continue
        parent_to_bone(obj, arm, bone_name)
    return arm


# ---------------------------------------------------------------- animation
def _pose_bone(arm, name):
    return arm.pose.bones[name]


def _key(pb, frame, rot=None, loc=None, scale=None):
    if rot is not None:
        pb.rotation_mode = "XYZ"
        pb.rotation_euler = rot
        pb.keyframe_insert("rotation_euler", frame=frame)
    if loc is not None:
        pb.location = loc
        pb.keyframe_insert("location", frame=frame)
    if scale is not None:
        pb.scale = scale
        pb.keyframe_insert("scale", frame=frame)


def _reset_pose(arm):
    for pb in arm.pose.bones:
        pb.rotation_mode = "XYZ"
        pb.rotation_euler = (0, 0, 0)
        pb.location = (0, 0, 0)
        pb.scale = (1, 1, 1)
        pb.location = (0, 0, 0)
        pb.scale = (1, 1, 1)


def _new_action(arm, name):
    action = bpy.data.actions.new(name)
    action.use_fake_user = True
    if arm.animation_data is None:
        arm.animation_data_create()
    arm.animation_data.action = action
    return action


def _finish_action(arm, action, start, end, loop):
    action.frame_range = (start, end)
    # Push to an NLA strip named after the clip so the glTF exporter emits one
    # named animation per clip.
    track = arm.animation_data.nla_tracks.new()
    track.name = action.name
    strip = track.strips.new(action.name, int(start), action)
    strip.name = action.name
    strip.use_auto_blend = False
    arm.animation_data.action = None
    return strip


def animate_idle(arm, parts):
    """2.0 s loop: breathing, head sway, blink."""
    action = _new_action(arm, "idle")
    _reset_pose(arm)
    chest = _pose_bone(arm, "chest")
    head = _pose_bone(arm, "head")
    sh_l = _pose_bone(arm, "shoulder.L")
    sh_r = _pose_bone(arm, "shoulder.R")
    eye_bl = _pose_bone(arm, "eye.L")
    eye_br = _pose_bone(arm, "eye.R")
    frames = [(0, 0.0, 0.0, 0.0), (15, 0.02, 0.05, 0.03), (30, 0.0, 0.0, 0.0),
              (45, -0.02, -0.05, -0.03), (60, 0.0, 0.0, 0.0)]
    for f, ch, hd, sh in frames:
        _key(chest, f, rot=(ch, 0, 0))
        _key(head, f, rot=(0, 0, hd))
        _key(sh_l, f, rot=(0, 0, sh))
        _key(sh_r, f, rot=(0, 0, -sh))
    # Blink: the eye bones squash briefly near the end of the loop (bone
    # local Y runs along the bone, i.e. world vertical, so scale Y squashes
    # the eye curves vertically). Bone-driven, so the blink rides the idle
    # clip instead of exporting as a stray object action.
    for f, s in ((0, 1.0), (52, 1.0), (55, 0.12), (58, 1.0), (60, 1.0)):
        _key(eye_bl, f, scale=(1, s, 1))
        _key(eye_br, f, scale=(1, s, 1))
    _finish_action(arm, action, 0, 60, loop=True)


def animate_walk(arm, parts):
    """1.0 s loop: legs and arms counter-swing, hips bob."""
    action = _new_action(arm, "walk")
    _reset_pose(arm)
    th_l = _pose_bone(arm, "thigh.L")
    th_r = _pose_bone(arm, "thigh.R")
    kn_l = _pose_bone(arm, "knee.L")
    kn_r = _pose_bone(arm, "knee.R")
    sh_l = _pose_bone(arm, "shoulder.L")
    sh_r = _pose_bone(arm, "shoulder.R")
    hips = _pose_bone(arm, "hips")
    chest = _pose_bone(arm, "chest")
    swing = math.radians(18)
    arm_swing = math.radians(12)
    knee_bend = math.radians(28)
    for f, s in ((0, 0.0), (7, 1.0), (15, 0.0), (22, -1.0), (30, 0.0)):
        _key(th_l, f, rot=(swing * s, 0, 0))
        _key(th_r, f, rot=(-swing * s, 0, 0))
        _key(kn_l, f, rot=(knee_bend * max(0.0, -s), 0, 0))
        _key(kn_r, f, rot=(knee_bend * max(0.0, s), 0, 0))
        _key(sh_l, f, rot=(-arm_swing * s, 0, 0))
        _key(sh_r, f, rot=(arm_swing * s, 0, 0))
        _key(hips, f, loc=(0, 0, -0.02 * abs(s)))
        _key(chest, f, rot=(math.radians(4), 0, 0))
    _finish_action(arm, action, 0, 30, loop=True)


def animate_talk(arm, parts):
    """1.6 s loop: head nods + small right-hand gestures (audio-driven in-game)."""
    action = _new_action(arm, "talk")
    _reset_pose(arm)
    head = _pose_bone(arm, "head")
    sh_r = _pose_bone(arm, "shoulder.R")
    el_r = _pose_bone(arm, "elbow.R")
    chest = _pose_bone(arm, "chest")
    for f, nod, gest in ((0, 0.0, 0.0), (12, 0.10, 0.35), (24, -0.04, 0.15),
                         (36, 0.08, 0.40), (48, 0.0, 0.0)):
        _key(head, f, rot=(nod, 0, nod * 0.4))
        _key(sh_r, f, rot=(-math.radians(28) * gest / 0.4, 0, -math.radians(10) * gest / 0.4))
        _key(el_r, f, rot=(-math.radians(35) * gest / 0.4, 0, 0))
        _key(chest, f, rot=(math.radians(2), 0, 0))
    _finish_action(arm, action, 0, 48, loop=True)


def animate_point(arm, parts):
    """1.2 s one-shot: right arm extends forward, head follows, hold, return."""
    action = _new_action(arm, "point")
    _reset_pose(arm)
    sh_r = _pose_bone(arm, "shoulder.R")
    el_r = _pose_bone(arm, "elbow.R")
    head = _pose_bone(arm, "head")
    chest = _pose_bone(arm, "chest")
    fwd = -math.radians(88)  # arm hanging down (-Z) -> forward (-Y)
    for f, t in ((0, 0.0), (12, 1.0), (24, 1.0), (36, 0.0)):
        _key(sh_r, f, rot=(fwd * t, 0, 0))
        _key(el_r, f, rot=(0, 0, 0))
        _key(head, f, rot=(0, 0, -0.12 * t))
        _key(chest, f, rot=(0, 0, -0.05 * t))
    _finish_action(arm, action, 0, 36, loop=False)


def animate_greeting(arm, parts):
    """1.2 s one-shot: right hand raises and waves, head tilts."""
    action = _new_action(arm, "greeting")
    _reset_pose(arm)
    sh_r = _pose_bone(arm, "shoulder.R")
    el_r = _pose_bone(arm, "elbow.R")
    wr_r = _pose_bone(arm, "wrist.R")
    head = _pose_bone(arm, "head")
    for f, t, wave in ((0, 0.0, 0.0), (10, 1.0, 0.0), (16, 1.0, 0.5),
                       (22, 1.0, -0.5), (28, 1.0, 0.3), (36, 0.0, 0.0)):
        _key(sh_r, f, rot=(-math.radians(55) * t, 0, -math.radians(25) * t))
        _key(el_r, f, rot=(-math.radians(75) * t, 0, 0))
        _key(wr_r, f, rot=(0, 0, wave))
        _key(head, f, rot=(0, 0, 0.15 * t))
    _finish_action(arm, action, 0, 36, loop=False)


def animate_thinking(arm, parts):
    """1.6 s loop: head tilts, right hand rises toward the chin."""
    action = _new_action(arm, "thinking")
    _reset_pose(arm)
    head = _pose_bone(arm, "head")
    sh_r = _pose_bone(arm, "shoulder.R")
    el_r = _pose_bone(arm, "elbow.R")
    chest = _pose_bone(arm, "chest")
    for f, t in ((0, 0.0), (16, 1.0), (32, 1.0), (48, 0.0)):
        _key(head, f, rot=(0.08 * t, 0, 0.20 * t))
        _key(sh_r, f, rot=(-math.radians(40) * t, 0, 0))
        _key(el_r, f, rot=(-math.radians(95) * t, 0, 0))
        _key(chest, f, rot=(0, 0, 0))
    _finish_action(arm, action, 0, 48, loop=True)


# ---------------------------------------------------------------- render
def setup_camera_lights():
    bpy.ops.object.camera_add(location=(0, -4.2, 1.0))
    cam = bpy.context.active_object
    cam.name = "RenderCam"
    cam.rotation_euler = (math.radians(84), 0, 0)
    bpy.context.scene.camera = cam
    # Key light + rim light (EEVEE).
    bpy.ops.object.light_add(type="SUN", location=(2, -3, 4))
    sun = bpy.context.active_object
    sun.data.energy = 4.0
    sun.rotation_euler = (math.radians(50), 0, math.radians(30))
    bpy.ops.object.light_add(type="AREA", location=(-2, -2, 2))
    fill = bpy.context.active_object
    fill.data.energy = 350.0
    fill.data.shape = "DISK"
    fill.rotation_euler = (math.radians(60), 0, math.radians(-40))
    # Back rim so the back view is not black.
    bpy.ops.object.light_add(type="AREA", location=(0, 3, 2.5))
    rim = bpy.context.active_object
    rim.data.energy = 200.0
    rim.data.shape = "DISK"
    rim.rotation_euler = (math.radians(55), 0, math.radians(180))
    return cam


def _cycles(scene, samples):
    # Headless has no GPU (EEVEE/Workbench need Vulkan) — Cycles on CPU works.
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = False


def _aim_camera(cam, loc, target):
    # Camera looks along -Z, up must stay world +Z in every view.
    forward = (target - Vector(loc)).normalized()
    z_axis = -forward
    x_axis = Vector((0, 0, 1)).cross(z_axis).normalized()
    y_axis = z_axis.cross(x_axis)
    rot = Matrix((x_axis, y_axis, z_axis)).transposed().to_4x4()
    cam.matrix_world = Matrix.Translation(Vector(loc)) @ rot


def render_views(out_dir, arm):
    scene = bpy.context.scene
    _cycles(scene, 32)
    scene.render.resolution_x = 640
    scene.render.resolution_y = 640
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    cam = bpy.data.objects["RenderCam"]
    # T-pose reset for the stills: clear any NLA influence by muting tracks.
    for track in arm.animation_data.nla_tracks:
        track.mute = True
    views = {
        "cypher-front": (0, -3.1, 1.0),
        "cypher-side": (3.1, 0, 1.0),
        "cypher-back": (0, 3.1, 1.0),
    }
    target = Vector((0, 0, 0.85))
    for name, (x, y, z) in views.items():
        _aim_camera(cam, (x, y, z), target)
        scene.render.filepath = os.path.join(out_dir, f"{name}.png")
        bpy.ops.render.render(write_still=True)
        print(f"rendered {name}.png")
    for track in arm.animation_data.nla_tracks:
        track.mute = False


def render_preview_frames(out_dir, arm):
    """Render the walk clip (frames 0..30) for the MP4 preview."""
    frames_dir = os.path.join(out_dir, "frames")
    os.makedirs(frames_dir, exist_ok=True)
    scene = bpy.context.scene
    _cycles(scene, 24)
    scene.render.resolution_x = 480
    scene.render.resolution_y = 480
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    cam = bpy.data.objects["RenderCam"]
    _aim_camera(cam, (1.9, -2.5, 1.1), Vector((0, 0, 0.85)))
    # Play only the walk strip.
    for track in arm.animation_data.nla_tracks:
        track.mute = track.name != "walk"
    scene.frame_start = 0
    scene.frame_end = 30
    scene.frame_step = 2
    scene.render.filepath = os.path.join(frames_dir, "walk-")
    bpy.ops.render.render(animation=True)
    for track in arm.animation_data.nla_tracks:
        track.mute = False
    print(f"rendered walk preview frames to {frames_dir}")


# ---------------------------------------------------------------- stats
def stats_report(out_dir):
    tris = 0
    meshes = 0
    for obj in bpy.context.scene.objects:
        if obj.type == "MESH":
            meshes += 1
            tris += len(obj.data.polygons)
    mats = len(bpy.data.materials)
    arm = bpy.data.objects.get("CypherRig")
    clips = []
    if arm and arm.animation_data:
        for track in arm.animation_data.nla_tracks:
            strip = track.strips[0] if track.strips else None
            if strip:
                clips.append((strip.name, int(strip.frame_start), int(strip.frame_end)))
    report = {
        "meshes": meshes, "triangles": tris, "materials": mats,
        "clips": [{"name": n, "frames": [s, e], "seconds": round((e - s) / FPS, 2)} for n, s, e in clips],
    }
    import json
    with open(os.path.join(out_dir, "cypher-stats.json"), "w") as fh:
        json.dump(report, fh, indent=2)
    print("STATS:", json.dumps(report))
    return report


# ---------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    args = ap.parse_args(sys.argv[sys.argv.index("--") + 1:])
    out_dir = args.out
    os.makedirs(out_dir, exist_ok=True)

    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1.0
    bpy.context.scene.render.fps = FPS

    parts = build_model()
    arm = build_rig(parts)
    bpy.context.view_layer.objects.active = arm
    for fn in (animate_idle, animate_walk, animate_talk, animate_point, animate_greeting, animate_thinking):
        fn(arm, parts)
    _reset_pose(arm)

    # Save the .blend next to the outputs; the caller moves it into the repo.
    blend_path = os.path.join(out_dir, "cypher.blend")
    bpy.ops.wm.save_as_mainfile(filepath=blend_path)
    print(f"saved {blend_path}")

    # Export GLB (all NLA strips become named animations).
    glb_path = os.path.join(out_dir, "cypher.glb")
    bpy.ops.export_scene.gltf(  # Blender >= 5.0 renamed gltf2 -> gltf
        filepath=glb_path,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_skins=True,
        export_animations=True,
        export_nla_strips=True,
        export_optimize_animation_size=True,
        export_texcoords=True,
        export_normals=True,
    )
    print(f"exported {glb_path} ({os.path.getsize(glb_path)} bytes)")

    setup_camera_lights()
    render_views(out_dir, arm)
    render_preview_frames(out_dir, arm)
    stats_report(out_dir)
    print("BUILD DONE")


if __name__ == "__main__":
    main()
