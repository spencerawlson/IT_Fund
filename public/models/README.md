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
| `cypher.glb` | Cypher, the 3D AI tutor robot in the SOC room (Cyber Missions Phase 2). Original work — modelled procedurally in Blender from the approved character sheets, not a third-party asset. 1.70 m tall, 11,676 triangles, 6 animation clips (idle, walk, talk, point, greeting, thinking). Source: `assets/blender/cypher.blend`, rebuilt by `assets/blender/build_cypher.py`. |

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
| | | | |
