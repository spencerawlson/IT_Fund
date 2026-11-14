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
| `lab-switch.glb` | 3D Network Switch | Spencer's own Meshy generation (2026-11-14), slimmed to 20,000 tris / ~1.3 MB. |
| `lab-router.glb` | 3D Enterprise Router | Spencer's own Meshy generation (2026-11-14), slimmed to 20,000 tris / ~1.4 MB. |
| `lab-firewall.glb` | 3D Next-Gen Firewall | Spencer's own Meshy generation (2026-11-14), slimmed to 100,896 tris / 1.34 MB. Untextured — Meshy generated it without a texture pass, so its look is pure geometry; a Planar pass + smooth normals keep the flat faces clean. |
| `lab-access-point.glb` | 3D Wireless Access Point | Spencer's own Meshy generation (2026-11-14), slimmed to 20,000 tris / ~1.3 MB. |
| `lab-nas.glb` | 3D NAS Storage | Spencer's own Meshy generation (2026-11-14), slimmed to 20,000 tris / 1.53 MB. Two-stage slim (gltf-transform meshopt, then Blender) — the 5.5M-tri source OOMs Blender's decimator. |
| `lab-ups.glb` | 3D UPS | Spencer's own Meshy generation (2026-11-14), slimmed to 20,000 tris / 1.45 MB. |
| `lab-rack-server.glb` | 3D Rack Server | Spencer's own Meshy generation (2026-11-14), slimmed to 56,359 tris / 1.16 MB. Untextured — see firewall. |
| `lab-server-rack.glb` | 3D Server Rack | Spencer's own Meshy generation (2026-11-14), slimmed to 20,000 tris / 1.39 MB. The 42U rack. Two-stage slim (gltf-transform meshopt, then Blender) — the 7.8M-tri source OOMs Blender's decimator. |
| `lab-cloud.glb` | 3D Cloud Architecture | Spencer's own Meshy generation (2026-11-14), slimmed to 20,000 tris / ~1.3 MB. The blueprint sheet as a standing panel. |

Slimming recipe (all nine): Blender decimate to the tri target above,
textures downscaled (base color 1024, normal 1024, other 512), exported as
GLB with JPEG textures (quality 85), no Draco (the app's GLTFLoader has no
DRACOLoader configured). Build script: `~/workspace/visual-lab-meshy/scripts/slim_equipment.py`;
source GLBs (30–287 MB each) stay out of the repo in
`~/workspace/browser_downloads/sess-637002319/`.

## Expected files (drop `.glb` here, these exact names)

| File | Used for device roles |
|---|---|
| `switch.glb` | access/core switches |
| `router.glb` | routers, gateways |
| `server.glb` | servers |
| `firewall.glb` | firewalls |
| `cloud.glb` | internet / upstream cloud |
| `pc.glb` | workstations / hosts |
| `cypher.glb` | Cypher, the 3D AI tutor robot in the SOC room (Cyber Missions Phase 2). Spencer's own Meshy AI generation (PRO account spencerawlson.gobold), rigged + optimized in Blender, 1.70 m tall, 20,000 triangles, 24 bones, 1 SkinnedMesh, 6 animation clips (idle, walk, talk, point, greeting, thinking). Build sources stay out of the repo: `~/workspace/meshy-robots-work/` (build_robot.py + cypher.blend). Replaces the earlier procedural build (its source stays at `assets/blender/cypher.blend` as history). |
| `sentinel.glb` | Sentinel, the commander robot in the SOC room. Spencer's own Meshy AI generation, same rig shape as Cypher (1.70 m, 20,000 triangles, 24 bones, 6 clips). |
| `patch.glb` | Patch, the systems-engineer robot in the SOC room. Spencer's own Meshy AI generation, same rig shape (1.70 m, 1.40 m wide on tank treads, 20,000 triangles, 24 bones, 6 clips — his walk is a bob/rock, driven as-is). |
| `datacenter.glb` | The data-center room the SOC scene lives in. Spencer's own Meshy AI generation, 4.85 × 2.70 × 5.21 m, 60,000 triangles, static (no bones, no clips). |

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
| lab-switch.glb | Meshy AI (meshy.ai), generated 2026-11-14 on Spencer's PRO account, slimmed to 20,000 tris | Spencer's own generation | spencerawlson |
| lab-router.glb | Meshy AI (meshy.ai), generated 2026-11-14 on Spencer's PRO account, slimmed to 20,000 tris | Spencer's own generation | spencerawlson |
| lab-firewall.glb | Meshy AI (meshy.ai), generated 2026-11-14 on Spencer's PRO account, slimmed to 40,000 tris, untextured | Spencer's own generation | spencerawlson |
| lab-access-point.glb | Meshy AI (meshy.ai), generated 2026-11-14 on Spencer's PRO account, slimmed to 20,000 tris | Spencer's own generation | spencerawlson |
| lab-nas.glb | Meshy AI (meshy.ai), generated 2026-11-14 on Spencer's PRO account, slimmed to 20,000 tris | Spencer's own generation | spencerawlson |
| lab-ups.glb | Meshy AI (meshy.ai), generated 2026-11-14 on Spencer's PRO account, slimmed to 20,000 tris | Spencer's own generation | spencerawlson |
| lab-rack-server.glb | Meshy AI (meshy.ai), generated 2026-11-14 on Spencer's PRO account, slimmed to 40,000 tris, untextured | Spencer's own generation | spencerawlson |
| lab-server-rack.glb | Meshy AI (meshy.ai), generated 2026-11-14 on Spencer's PRO account, slimmed to 20,000 tris | Spencer's own generation | spencerawlson |
| lab-cloud.glb | Meshy AI (meshy.ai), generated 2026-11-14 on Spencer's PRO account, slimmed to 20,000 tris | Spencer's own generation | spencerawlson |
