# Ashen Reach: The Deep

A deterministic browser roguelike built with plain HTML, CSS, Canvas and JavaScript ES modules. No framework, build, network asset or runtime dependency.

## Run

Serve this directory over HTTP:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000`. ES modules are not supported from `file://`.

Run the Node logic suite (Node 22+):

```sh
node --test
# or npm test
```

## Start and controls

The flow is **title → character creation → run**. The seed entry's random button chooses a new world seed; **Today's Challenge** uses the current UTC date. Character randomization does not alter the pending world seed. Confirm the character to enter the dungeon.

- **Move:** WASD / arrow keys, touch D-pad, or click a visible tile (A* guides the first step).
- **Attack:** bump an adjacent enemy, or click an enemy within current reach.
- **Interact:** E for caches, events, traders or floor objects. **DESCEND** works on the stair tile; Space waits; I opens the character/equipment and pack panel.
- **Loot:** drops appear on the map and are auto-collected on a step, without an extra pickup turn. A full pack leaves the object on the ground. Coins go directly to the counter. Discarding an item or dropping worn gear costs a turn; return to the tile to collect it.
- **Equipment:** seven separate slots—weapon, armor, helmet, boots, ring I, ring II and amulet—beside a 20-cell pack. Equipping returns the previous piece to the pack; if the pack cannot accept it, the swap is refused. Worn gear can be unequipped into the pack or dropped directly onto the floor.

## Character creation and equipment

Classes and options live in `js/data/` rather than scattered UI code:

- **Vanguard:** stronger guard and a once-per-floor hit reduction.
- **Wayfinder:** longer sight and reach.
- **Ember Adept:** life-steal passive.
- Appearance options include four skin tones, five hair styles/colors, four face treatments and five outfit colors. The default character is sanitized and saved in localStorage for the next run.

Loot rarities are Common, Uncommon, Rare, Epic and Legendary, with increasing attribute counts and distinct data colors/glows. Gear attributes include attack, defense, max HP, crit, speed/evasion, reach, vision, life-steal and thorns. Tonics and materials stack by effect/material plus rarity. Item visual IDs map into procedural shapes in `js/data/itemVisuals.js`.

`js/ui/characterRenderer.js` composes an original 32×40 Canvas character in layered order: shadow, body, base clothing, boots, armor, hair/helmet, accessories/weapon, effects. A helmet replaces the hair layer; facing mirrors left/right; idle/movement bob and damage flash are drawn. Offscreen composites are cached by look/equipment. The creation preview and in-run character panel use the same renderer.

## Drops and particles

Floor drops are data records with stable per-run entity IDs, source, item snapshot and grid position, leaving a clean boundary for a future server-authoritative online mode. Multiplayer/online mode is not implemented. Enemy and cache rewards are seed-driven; currency is added directly to gold, while items can be picked up, stacked, equipped, discarded or dropped from a gear slot.

`js/ui/particles.js` is independent of the turn simulation. It uses declarative presets, delta-time updates and a reusable object pool capped at 500. Presets cover rarity-colored drop glints/bursts, pickup trails, equip aura, damage/death sparks, dust, torch sparks, lava embers, water bubbles, foundry sparks and stair spirals. World-bound effects are emitted/drawn only for visible tiles. The **Reduced visual effects** menu option is saved separately in localStorage and lowers the effect rate; particles never advance a turn.

## Biomes and dungeon presentation

Five original, data-defined environments live in `js/data/biomes.js`: **Basalt Halls** (`stone`), **The Quiet Sepulcher** (`crypt`), **Buried Thermal Foundry** (`foundry`), **Cinderflow Cavern** (`lava`) and **The Ashen Sanctuary** (`sanctum`). The ordinary floor progression is stone → crypt → foundry → lava. The entry room on later floors retains the preceding material palette as a deliberate transition; treasure/event/boss rooms may use the sanctuary theme. Biome and room decoration streams are derived from the world seed but isolated from combat/map RNG, so replaying a seed reproduces rooms, themes, props, hazards and lights without changing game decisions.

`js/core/map/biome-layout.js` paints room/corridor biome IDs, props, light sources, visual trap marks and a limited number of blocking pillars/rubble. Before placement it reserves shortest routes from spawn to every room center and the stairs, plus feature/enemy cells; blocking props become ordinary wall tiles outside those routes, so player collision, enemy A* and flood-fill agree. Spike/fissure/arc markers are intentionally visual-only in this scope and do not apply hidden damage. Water, lava and energy patterns remain walkable decorative surfaces.

`js/render/biome-renderer.js` draws original Canvas geometry from palette data. Walls use a cardinal autotile mask and a raised cap plus south-facing masonry face; six neighborhood cases alter edge/seam details. Floor marks use a coordinate hash from the visual seed for deterministic flecks, plate seams, dust, mosaic and basalt cracks, not repeated image tiles. Original prop silhouettes are composed from Canvas primitives; there are no external art assets.

`js/render/dungeon-renderer.js` uses an offscreen static terrain/prop cache keyed by map and tile size, then layers fog, visible interactables and actors. The animation overlay redraws only small water/lava/energy accents and radial light pools. Light gradients use additive blending, have a soft biome-colored vignette and are clipped to the current visible-tile mask to prevent lighting through unexplored fog. Reduced-effects mode holds animation at a stable frame and skips optional radial light/ambient effects; navigation, map seed and simulation are unchanged. The minimap and HUD accent follow the current floor biome.

The HUD has a segmented **Vitality** bar and an **Experience / Resonance** progress bar. The current game core has no mana or spell resource; the second bar therefore reports real XP toward the next level instead of presenting a fake mana value. No new combat resource was introduced for a visual-only task.

## Architecture and algorithms

- `js/core/` is browser-independent: it does not import DOM, Canvas, Web Audio or localStorage.
- **BSP** divides the 60×36 map into inset rooms and joins child-room representatives with L-corridors. A cardinal flood fill asserts all walkable cells connect.
- **Seed:** FNV-1a hashes text into Mulberry32 streams. Forked streams isolate decisions; daily seed format is `ASHEN-YYYY-MM-DD` in UTC.
- **A*** uses cardinal movement, Manhattan distance and deterministic tie-breaking; it returns a path including endpoints or `[]` if unreachable.
- **FOV** uses Bresenham raycasts; blocking walls remain visible, cells behind them are hidden, and explored cells stay charted.
- The game core owns turn order, combat, enemies, drops, equipment swaps, floor transitions, events and permadeath. Rendering/UI issue intents and draw the returned state.
- The four-floor run includes shops, treasure, choices/events and the Vault Warden. Progression persists score, records, mutator unlocks and default character; run inventory/equipment does not survive permadeath.

## Files

```text
index.html                 screens and accessible controls
css/styles.css             responsive desktop/mobile layout
js/main.js                 UI composition, input, audio and visual effects
js/core/                   deterministic game rules, maps, combat and character data
js/data/                   classes, appearance, item visuals and five biome palettes/rules
js/items/                  inventory stacks, equipment slots and floor drops
js/render/                 procedural tiles, biome lighting, fog and minimap cache
js/ui/                     character compositor and particle pool
STYLE.md                   original visual direction derived from broad reference lessons
js/utils/                  guarded localStorage and random-seed adapters
tests/                     Node test suites
PLANO.md                   architecture and staged checklist
```

## Verification and limitations

`node --test` currently passes **58 tests**, including 500 world seeds across all four floors with props/hazards, route preservation to every room/feature/enemy/stair, biome data completeness/progression/replay, autotiling and FOV-clipped light/cache checks, plus RNG/path/FOV, character options, inventory/equipment, particle pooling, storage fallbacks and a scripted full run. `node --check` has been run on every JavaScript module.

This environment has no browser executable, so no visual browser/device playthrough is claimed. The static page is served locally at `http://localhost:8000` and responds successfully; the menu-to-character-to-game flow, touch hit areas, audio policy, color contrast and Canvas cache performance still need verification in an actual browser. A deterministic loot-seeking balance smoke test is part of Node tests; manual tuning remains open. See `PLANO.md` for checklist and remaining QA.

## Style references — inspiration only

The supplied images in `/workspace/desktop/ref/` (`images _1_.jpg`, `images _2_.jpg`, `images _3_.jpg`, `images.png`) were consulted only for general lessons about limited per-environment palettes, warm/cool light contrast, spatial depth and purposeful prop density. The implementation proceeded from `STYLE.md` without revisiting the images. No sprite, tile, pixel arrangement, room layout, prop silhouette, palette sequence, composition or other asset was copied or closely recreated. All biome geometry, palettes, patterns, props and effects are original Canvas drawing/data.
