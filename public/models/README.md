# 3D device models (glTF/GLB) for the network topology view

`NetworkScene3D` loads a real model per device from this folder, served at
`/models/<key>.glb`. Until a file is present, the view falls back to the
procedural Visual-Lab model for that role, so the scene always renders.

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
