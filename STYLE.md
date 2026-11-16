# STYLE — Ashen Reach dungeon visuals

This document records only broad lessons from the supplied references and sets an original art direction. The images are now out of scope for this implementation; all implementation decisions must follow this file, the game context and the user's written requirements.

## Lessons retained

- Give each environment a small, recognizable palette and keep most pixels in dark/mid values so the walkable route reads clearly.
- Build visual hierarchy from a restrained floor texture, a thicker wall silhouette, a few purposeful props and a small number of bright light sources. Brightness should tell the player where danger, exits and interactables are.
- Use cool ambient darkness against warm or colored light. Vary the hue of light by environment rather than applying one universal glow.
- Create texture with sparse, deterministic local variation—flecks, seams, chips and cracks—so adjacent floor cells do not look stamped from one tile.
- Let props support the room's story and leave negative space around movement lanes. Decorations must never reduce map reachability.
- Suggest depth with a top wall cap and a distinct front/underside face. Keep outlines and edge contrast consistent at small canvas sizes.

These are general observations only. No pixel pattern, room arrangement, sprite, prop silhouette, composition or asset is to be reconstructed from a reference.

## Original direction

Ashen Reach is a descent from worked basalt halls into old burial chambers, a buried thermal apparatus, volcanic caverns and a lost sanctuary. The game's own charcoal / teal / amber identity remains visible across all zones. Pixels and geometry are drawn procedurally in Canvas; there are no external assets.

### Biome palettes and cues

| Biome ID | Palette direction | Original room vocabulary | Light / hazards |
|---|---|---|---|
| `stone` | slate, blue-charcoal, muted steel; amber accents | chipped masonry, iron grates, simple chests, wall sconces | low cool ambient, warm torch pools; occasional floor spikes |
| `crypt` | umber, soot, desaturated bone, deep teal | sarcophagi, scattered bones, carved plinths, narrow water seams | low teal ambient, cyan-green flame pools; water is decorative/non-blocking |
| `foundry` | graphite, oxidized copper, restrained cyan with four signal colors | segmented plates, rivets, conduit seams, terminals and a heat-core platform | strong localized colored pulse; plate seams remain subtle |
| `lava` | near-black basalt, dark rust, ember orange | basalt shelves, fissures, clinker, cinder vents | orange-red fissure light and sparse drifting embers; lava channels are marked as hazardous or decorative by explicit data |
| `sanctum` | ash ivory, faded plum, dusk teal, candle gold | broken pillars, worn shelves, votive stones and fractured colored-glass motifs | candle pools and subdued stained-light accents; used for special rooms and as a transition accent |

### Composition and readability

- Floor detail is low contrast and seeded from world/floor/cell data. No repeated large motif or single obvious checker pattern.
- Wall caps occupy the tile's upper band; visible front faces are drawn on the south-facing edge. Autotile shape comes only from the four cardinal wall neighbors (isolated, end, straight, corner, tee and cross), with stable seams at chunk/screen edges.
- Props use original simple silhouettes assembled from Canvas primitives. Each prop has a footprint, clearance and interaction/blocking policy in data; the generation pass preserves the critical route.
- Light is a final world-space pass clipped to currently visible tiles. It combines low ambient color, bounded radial pools, a subtle vignette and a small deterministic flame flicker. UI and unseen fog are never lit through.
- Water, lava and energy cores animate with a few pixel shifts/pulses only. Reduced-effects mode holds them at stable frames and removes optional glow/flicker/ambient particles; navigation and state do not change.

## Transition rule

The four run floors progress from worked stone to crypt, then foundry to lava. Each floor has a declared primary biome. One guaranteed room near the entry carries the previous floor's material vocabulary as a transition zone, while the remaining ordinary rooms use the current primary biome. The final boss/special room can use `sanctum` regardless of depth. Room selection and all visual details are derived from the floor's seeded visual stream. Thus the transition is readable without mixing unrelated palettes on every tile.

## Technical constraints

The biome palette, tile marks, prop rules, light settings and transition schedule belong in `js/data/biomes.js`; the renderer consumes descriptors and never makes gameplay decisions. All decoration is deterministic. Props and hazard footprints are chosen only after a protected route is computed. Static floor/wall geometry is cached offscreen per generated floor; time-varying animation and visible light are separate passes. Reduced effects suppress optional visual animation without touching the map seed or simulation RNG.