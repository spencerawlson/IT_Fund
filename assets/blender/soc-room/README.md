# SOC room (Cypher / Sentinel / Patch) — Blender build

`public/models/soc-room.glb` is built from this folder. It replaced the Meshy
`datacenter.glb` as the mission SOC's room on 2026-11-16 (Spencer's concept
render: bright white SOC, blue LED coves, glass partitions, Cypher's desk with
a monitor wall, Sentinel's server room, Patch's fabrication workshop).

- Same frame and layout as `src/components/three/socLayout.js`: Blender
  metres, x east, y north, z up, floor top at z = 0, centred on the origin;
  4.85 x 5.21 m, ceiling 2.70 m, partitions at y = 0.18 and x = 0.42, Cypher's
  chair seat at (-1.05, -1.2) z 0.60. The room continues 2.4 m south so the
  eye-level cameras can stand back; the south end is open.
- No Cycles and no baking (the build host has no AVX2): plain geometry with
  PBR and emissive materials, lit at runtime by `MissionSocScene.addSocLights`.
  `prepareSocRoom` makes the `Glass` material see-through and tunes the floor.
- Material names are part of the contract (`Glass`, `LED`, `LightPanel`,
  `Floor`, …): `prepareSocRoom` keys on them. Meshes are merged per material
  (36 meshes, ~11k triangles, ~1.1 MB).

## Rebuild

```bash
python make_textures.py            # writes tex/*.png (seeded, deterministic per font set)
blender -b -P build_soc_room.py -- tex ../../../public/models/soc-room.glb
```

`tex/` is committed so a rebuild reproduces the shipped textures exactly even
where the system fonts differ. Any Blender 4.2+ works (5.2.2 was used).
