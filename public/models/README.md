# 3D device models (glTF/GLB) for the network topology view

`NetworkScene3D` loads a real model per device from this folder, served at
`/models/<key>.glb`. Until a file is present, the view falls back to the
procedural Visual-Lab model for that role, so the scene always renders.

## Visual Lab models (`lab-*.glb`)

The Visual Lab subjects load their own models from this folder, served at
`/models/lab-<device>.glb`. They use the `lab-` prefix deliberately: the
topology view's keys (`switch`, `router`, `server`, `firewall`, `cloud`)
feed the mission SOC scene, so the Lab must never reuse those names.

| File | Visual Lab subject | Notes |
|---|---|---|
| `lab-switch.glb` | 3D Network Switch | Spencer's own Meshy generation (2026-11-14), re-slimmed 2026-11-15 to 41,216 tris / 1.57 MB (v2). Flat clean top, crisp 48 ports, SFP+, vent grille. |
| `lab-router.glb` | 3D Enterprise Router | Spencer's own Meshy generation (2026-11-14), re-slimmed 2026-11-15 to 40,384 tris / 1.62 MB (v2). Flat top, crisp front (R2C, LAN/WAN/Console/SFP), clean side vent. |
| ~~`lab-firewall.glb`~~ | (retired 2026-11-16) | Removed. The Visual Lab firewall now shows the R2C NGFW blueprint sheet (`/blueprint-firewall-ngfw.jpg`, ~0.4 MB) via `BlueprintSubject`. The textured Meshy source only held up at ~189k tris / 3.5 MB; every slimmer version smeared its fragmented texture atlas. |
| `lab-access-point.glb` | 3D Wireless Access Point | Spencer's own Meshy generation (2026-11-14), re-slimmed 2026-11-15 to 19,373 tris / 0.95 MB (v2). Clean white disc, ribbed vent ring reads well. |
| `lab-nas.glb` | 3D NAS Storage | Spencer's own Meshy generation (2026-11-14), re-slimmed 2026-11-15 to 59,999 tris / 2.46 MB (v2, weld). 8 drive bays, handles, power/USB/LEDs readable; flat top; side vent reads as a grille. Small logo smear on the front-right panel. |
| `lab-ups.glb` | 3D UPS | Spencer's own Meshy generation (2026-11-14), re-slimmed 2026-11-15 to 59,999 tris / 2.33 MB (v2, weld). Clean vent grille with R2C logo, crisp display, power button, outlets. |
| `lab-patch-panel.glb` | 3D Patch Panel | Spencer's own Meshy generation (2026-11-15), slimmed 2026-11-16 to 60,000 tris / 1.75 MB (v2: meshopt pre-pass, weld, NO planar-dissolve, 6-stage Collapse with front protected). Two rows of 12 numbered RJ45 ports (01–24), mounting ears, clean black panel. |
| `lab-rack-server.glb` | 3D Rack Server | Meshy N1 regeneration (2026-11-14) — TEXTURED, fixes the plain-white PR #69 version. Slimmed 2026-11-15 to 39,456 tris / 1.61 MB (v2). Blue chassis, vent grilles, drive bays, front ports, flat top. |
| `lab-server-rack.glb` | 3D Server Rack | Spencer's own Meshy generation (2026-11-14), re-slimmed 2026-11-15 to 42,364 tris / 2.17 MB (v2). The 42U rack. Black frame, server units with coloured LEDs, R2C logo; side panel still slightly mottled. |
| `lab-cloud.glb` | 3D Cloud Architecture | Spencer's own Meshy generation (2026-11-14), re-slimmed 2026-11-15 to 20,000 tris / 0.84 MB (v2). Architecture panel fully legible (R2C Cloud, diagram, reference tables). |

Slimming recipe (v2, 2026-11-15): the raw look in PR #69 came from OUR
slimming, not the sources — the port/vent detail is real geometry, and the
20k-tri Collapse crushed it, while the normal map encoded Meshy's surface
noise as lumpy rock. v2: meshopt pre-pass (gltf-transform weld → simplify)
only where Blender OOMs on the raw source; Blender Planar-dissolve first
(flattens the undulating soupy surface into true planes); gentle Collapse
(30–60k tris, never the old 20k); merge duplicate UV-split verts first
(`--weld-dist 0.00001`) — the atlas splits every island, and the decimator
merges the wrong pairs without it, which is what made the vent 'coral' and
shredded the thin shells; DROP the normal map (it encodes surface noise);
base color kept at 1024, metallic-roughness 512; export GLB (JPEG q80, no
Draco); final `gltf-transform quantize` pass (KHR_mesh_quantization, natively
supported by three r171 — no loader change) for ~29% size saving, re-rendered
to confirm no visual damage. Build script:
`~/workspace/visual-lab-meshy-v2/scripts/slim_equipment_v2.py`; source GLBs
stay out of the repo in `~/workspace/browser_downloads/sess-3698905686/`
(the 7 re-downloads are byte-identical to the PR #69 sources in
`sess-637002319/`, verified by SHA-256; firewall + rack server are the new
Meshy N1 regenerations).

## Expected files (drop `.glb` here, these exact names)

| File | Used for device roles |
|---|---|
| `switch.glb` | access/core switches |
| `router.glb` | routers, gateways |
| `server.glb` | servers |
| `firewall.glb` | firewalls |
| `cloud.glb` | internet / upstream cloud |
| `pc.glb` | workstations / hosts |
| `cypher.glb` | Cypher, the 3D AI tutor robot in the SOC room (Cyber Missions Phase 2). Spencer's own Meshy AI generation (PRO account spencerawlson.gobold). **Rebuilt 2026-11-17** on Spencer's clean Meshy low-poly export (`Cypher_1.glb`: one sealed surface, 10,083 triangles, baked textures at 1024 JPEG) with the original rig and clips carried over by `assets/blender/robots/rebuild_robot.py` (skin weights: bone heat, each vertex kept to the limb the original body gave it, so elbows bend cleanly and a raised hand never drags the thigh) — the old 20,000-triangle body was ~1,000 unwelded shells and showed cracks. 1.70 m tall, 24 bones, 1 SkinnedMesh, 6 animation clips (idle, walk, talk, point, greeting, thinking). Build sources stay out of the repo: `~/workspace/meshy-robots-work/` (build_robot.py + cypher.blend). Replaces the earlier procedural build (its source stays at `assets/blender/cypher.blend` as history). |
| `sentinel.glb` | Sentinel, the commander robot in the SOC room. Spencer's own Meshy AI generation. **Rebuilt 2026-11-17** on Spencer's clean Meshy low-poly export (`Rigged_Sentinel.glb`, its Mixamo rig dropped; 10,273 triangles, sealed surface, 1024 JPEG textures) by `assets/blender/robots/rebuild_robot.py`, keeping the original rig and clips. Same rig shape as Cypher (1.70 m, 24 bones, 6 clips). |
| `patch.glb` | Patch, the systems-engineer robot in the SOC room. Spencer's own Meshy AI generation, same rig shape (1.70 m, 1.40 m wide on tank treads, 20,000 triangles, 24 bones, 6 clips — his walk is a bob/rock, driven as-is). |
| `datacenter.glb` | The data-center room the SOC scene lives in. Spencer's own Meshy AI generation, 4.85 × 2.70 × 5.21 m, 60,000 triangles, static (no bones, no clips). |
| `soc-room.glb` | The mission SOC room since 2026-11-16 — built in Blender from `assets/blender/soc-room/` (see its README) to the same measured layout as `datacenter.glb`: white SOC, blue LED coves, glass partitions, Cypher's desk + monitor wall, Sentinel's racks, Patch's workshop. ~11k triangles, 1.1 MB. `datacenter.glb` stays for the lesson handoff's backdrop. |

Keep each model reasonably low-poly (ideally < 1–2 MB) — they're scaled to a
uniform footprint, so absolute size/orientation don't need to match, but a model
that sits "upright on its base" reads best.

## CC0 / permissively-licensed sources

- **Poly Pizza** (https://poly.pizza) — search "router", "switch", "server",
  "computer", "desktop pc"; most are CC0 or CC-BY, direct `.glb` download.
- **Kenney** (https://kenney.nl/assets) — CC0 asset kits (download the GLB form).
- **Khronos glTF Sample Assets** (https://github.com/KhronosGroup/glTF-Sample-Assets)
  — CC0/royalty-free reference models.
- **Sketchfab** — filter License = CC0; download glTF.

Always confirm the license permits redistribution before committing the file,
and record the source + license below.

## Provenance (fill in when you add a file)

| File | Source URL | License | Author |
|---|---|---|---|
| cypher.glb | Meshy AI (meshy.ai), generated 2026-11-13 on Spencer's PRO account | Spencer's own generation | spencerawlson |
| sentinel.glb | Meshy AI (meshy.ai), generated 2026-11-13 on Spencer's PRO account | Spencer's own generation | spencerawlson |
| patch.glb | Meshy AI (meshy.ai), generated 2026-11-13 on Spencer's PRO account | Spencer's own generation | spencerawlson |
| datacenter.glb | Meshy AI (meshy.ai), generated 2026-11-13 on Spencer's PRO account | Spencer's own generation | spencerawlson |
| lab-switch.glb | Meshy AI (meshy.ai), generated 2026-11-14 on Spencer's PRO account, re-slimmed 2026-11-15 to 41,216 tris | Spencer's own generation | spencerawlson |
| lab-router.glb | Meshy AI (meshy.ai), generated 2026-11-14 on Spencer's PRO account, re-slimmed 2026-11-15 to 40,384 tris | Spencer's own generation | spencerawlson |
| lab-access-point.glb | Meshy AI (meshy.ai), generated 2026-11-14 on Spencer's PRO account, re-slimmed 2026-11-15 to 19,373 tris | Spencer's own generation | spencerawlson |
| lab-nas.glb | Meshy AI (meshy.ai), generated 2026-11-14 on Spencer's PRO account, re-slimmed 2026-11-15 to 59,999 tris (weld) | Spencer's own generation | spencerawlson |
| lab-ups.glb | Meshy AI (meshy.ai), generated 2026-11-14 on Spencer's PRO account, re-slimmed 2026-11-15 to 59,999 tris (weld) | Spencer's own generation | spencerawlson |
| lab-patch-panel.glb | Meshy AI (meshy.ai), generated 2026-11-15 on Spencer's PRO account, slimmed 2026-11-16 to 60,000 tris | Spencer's own generation | spencerawlson |
| lab-rack-server.glb | Meshy AI (meshy.ai), REGENERATED as Meshy N1 2026-11-14 on Spencer's PRO account (textured), slimmed 2026-11-15 to 39,456 tris | Spencer's own generation | spencerawlson |
| lab-server-rack.glb | Meshy AI (meshy.ai), generated 2026-11-14 on Spencer's PRO account, re-slimmed 2026-11-15 to 42,364 tris | Spencer's own generation | spencerawlson |
| lab-cloud.glb | Meshy AI (meshy.ai), generated 2026-11-14 on Spencer's PRO account, re-slimmed 2026-11-15 to 20,000 tris | Spencer's own generation | spencerawlson |
