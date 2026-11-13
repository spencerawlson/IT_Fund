# Blender sources for the Cyber Missions characters

`cypher.blend` is the source for `public/models/cypher.glb` (Cypher, the 3D AI
tutor robot — 1.70 m, white/navy armour, cyan emissive details, happy digital
face, shield tablet in the left hand). It is modelled procedurally from the
approved character sheets (`files/cyber-missions/characters/`, see the
modeling plan at `files/cyber-missions/phase-2-cypher-modeling-plan.md`).

Rebuild from scratch (Blender 5.3.0, headless):

```bash
blender --background --python assets/blender/build_cypher.py -- --out <dir>
```

The script builds the model, rig (26 bones), 6 animation clips (idle, walk,
talk, point, greeting, thinking), exports `cypher.glb`, and renders
front/side/back PNGs plus a walk-preview frame set with Cycles on CPU
(EEVEE/Workbench need a GPU and cannot initialise headless).

Do not hand-edit the `.blend` and re-export by hand: change
`build_cypher.py` instead, so the model stays reproducible. Commit the
regenerated `.glb` + `.blend` together.
