# Ashen Reach: The Deep

A deterministic browser roguelike built with plain HTML, CSS, Canvas and JavaScript ES modules. No framework, build, network asset or runtime dependency. Dungeon geometry, lighting, HUD and tiles remain procedural; the four user-supplied local spritesheets provide item, character, monster and effect sprites.

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
- **Equipment:** nine separate slots—weapon, shield, armor, gloves, helmet, boots, ring I, ring II and amulet—beside a 20-cell pack. Equipping returns the previous piece to the pack; if the pack cannot accept it, the swap is refused. Worn gear can be unequipped into the pack or dropped directly onto the floor.

## Character creation and equipment

Classes and options live in `js/data/` rather than scattered UI code:

- **Vanguard:** stronger guard and a once-per-floor hit reduction.
- **Wayfinder:** longer sight and reach.
- **Ember Adept:** life-steal passive.
- Appearance options include four skin tones, five hair styles/colors, four face treatments and five outfit colors. The player keeps the original procedural body; the character sheet is used for mobs, not the player silhouette.

Loot rarities are Common, Uncommon, Rare, Epic and Legendary, with increasing attribute counts and distinct data colors/glows. Gear stats include attack, defense, max HP, crit, speed/evasion, reach, vision, life-steal and thorns. Food heals; scrolls grant XP; tonics, food, scrolls and materials stack. Weapon, shield, armor, helmet, glove, boot, ring and amulet loot each resolves through an atlas category.

`js/ui/characterRenderer.js` keeps the original 32×40 procedural body, clothing, face and hairstyle, and layers sprites only for equipped gear. `js/data/sprite-character-visuals.js` defines hand/head/foot anchors and material masks. Armor palettes respond to material and rarity; a helmet covers the procedural hair, boots/gloves tint feet/hands, the shield sits in the off hand, and the weapon sprite swings procedurally. Facing mirrors all layers. Drawing clamps the composite and weapon to the viewport so the player is not cut at canvas edges. Offscreen composites are cached by appearance/equipment and reused by preview, pack and run.

## Drops and particles

Floor drops are data records with stable per-run entity IDs, source, item snapshot and grid position, leaving a clean boundary for a future server-authoritative online mode. Multiplayer/online mode is not implemented. Enemy and cache rewards are seed-driven; currency is added directly to gold, while items can be picked up, stacked, equipped, discarded or dropped from a gear slot.

`js/ui/particles.js` remains independent of the turn simulation with a 500-particle pool. It supplies rarity glints, pickup trails, equip auras, dust and environmental sparks. `js/data/effect-sprites.js` maps transient slash, blood, fire/explosion, water, magic, healing, status and speech-bubble sprites; `js/render/sprite-effects.js` bounds their lifetime/count and clips them to visible tiles. The **Reduced visual effects** option skips decorative sprite effects and ambient particles; map, RNG and combat are unchanged.

## Sprite atlas and character/monster presentation

`assets/sprites/` contains normalized local sheets; `assets/atlas.json` records sheet dimensions and each sprite ID/category/source rectangle. `js/render/sprite-atlas.js` loads the atlas and image sheets with promises, draws using integer scales and `imageSmoothingEnabled=false`, and shows a visible placeholder plus one console warning if a referenced sprite/sheet is missing. Loot chooses later IDs in a category as rarity/floor rises.

`tools/build-sprite-atlas.mjs` is a zero-dependency Node tool that edge-floods the screenshot matte to alpha, downsamples only sheets whose 3× pixel blocks were measured exactly, detects grid cells/components, applies `assets/atlas-overrides.json`, validates bounds/overlap and writes the atlas. Rebuild after editing overrides with `node tools/build-sprite-atlas.mjs`. Browse at `http://localhost:8000/tools/sprite-browser.html`; filters, numbered full sheets, crop/category/name editing, warning flags and override download are provided.

The original files were not found under the exact requested `Captura_de_tela_...` filenames. Four matching-content local sheets in `/workspace/desktop/ref/` were mapped by content and copied unmodified to `assets/sprites/source/`: `armas e armaduras 2.png` → items, `armas e armaduras.png` → items-small, `efeitos.png` → effects, `monstros.png` → characters. The raw screenshots are RGBA but fully opaque; the runtime copies key only edge-connected white/checkerboard matte pixels. The two sheets captured at exact 3× integer magnification are reduced by nearest-neighbor; the irregular effects sheet stays at native dimensions. `assets/atlas-overrides.json` has one reviewed gauntlet crop and emote corrections.

The initial generated atlas has 577 sprite rectangles across 41 category keys. **221 boxes are flagged as uncertain for review**: 128 item crops, 49 effect-component merges and 44 joined character-cell splits. The browser is provided so these boxes/categories can be corrected; do not treat flagged crops as visually verified until reviewed. See `CREDITS.md`: sheet authors, original sources and licenses were not supplied, so those fields remain blank.

## Biomes and dungeon presentation

Five original, data-defined environments live in `js/data/biomes.js`: **Basalt Halls** (`stone`), **The Quiet Sepulcher** (`crypt`), **Buried Thermal Foundry** (`foundry`), **Cinderflow Cavern** (`lava`) and **The Ashen Sanctuary** (`sanctum`). The ordinary floor progression is stone → crypt → foundry → lava. The entry room on later floors retains the preceding material palette as a deliberate transition; treasure/event/boss rooms may use the sanctuary theme. Biome and room decoration streams are derived from the world seed but isolated from combat/map RNG, so replaying a seed reproduces rooms, themes, props, hazards and lights without changing game decisions.

`js/core/map/biome-layout.js` paints room/corridor biome IDs, props, light sources, visual trap marks and a limited number of blocking pillars/rubble. Before placement it reserves shortest routes from spawn to every room center and the stairs, plus feature/enemy cells; blocking props become ordinary wall tiles outside those routes, so player collision, enemy A* and flood-fill agree. Spike/fissure/arc markers are intentionally visual-only in this scope and do not apply hidden damage. Water, lava and energy patterns remain walkable decorative surfaces.

`js/render/biome-renderer.js` draws original Canvas geometry from palette data. Walls use a cardinal autotile mask and a raised cap plus south-facing masonry face; six neighborhood cases alter edge/seam details. Floor marks use a coordinate hash from the visual seed for deterministic flecks, plate seams, dust, mosaic and basalt cracks, not repeated image tiles. Original prop silhouettes and all terrain tiles are composed from Canvas primitives; only the four permitted item/character/effect sheets are image assets.

`js/render/dungeon-renderer.js` uses an offscreen static terrain/prop cache keyed by map and tile size, then layers fog, visible interactables and actors. The animation overlay redraws only small water/lava/energy accents and radial light pools. Light gradients use additive blending, have a soft biome-colored vignette and are clipped to the current visible-tile mask to prevent lighting through unexplored fog. Reduced-effects mode holds animation at a stable frame and skips optional radial light/ambient effects; navigation, map seed and simulation are unchanged. The minimap and HUD accent follow the current floor biome.

The HUD has a segmented **Vitality** bar and an **Experience / Resonance** progress bar. The current game core has no mana or spell resource; the second bar therefore reports real XP toward the next level instead of presenting a fake mana value. No new combat resource was introduced for a visual-only task.

## Architecture and algorithms

- `js/core/` is browser-independent: it does not import DOM, Canvas, Web Audio or localStorage.
- **BSP** divides the 60×36 map into inset rooms and joins child-room representatives with L-corridors. A cardinal flood fill asserts all walkable cells connect.
- **Seed:** FNV-1a hashes text into Mulberry32 streams. Forked streams isolate decisions; daily seed format is `ASHEN-YYYY-MM-DD` in UTC.
- **A*** uses cardinal movement, Manhattan distance and deterministic tie-breaking; it returns a path including endpoints or `[]` if unreachable.
- **FOV** uses Bresenham raycasts; blocking walls remain visible, cells behind them are hidden, and explored cells stay charted.
- The game core owns turn order, combat, enemies, drops, equipment swaps, floor transitions, events and permadeath. Rendering/UI issue intents and draw the returned state.
- The four-floor run includes shops, treasure, choices/events and the Vault Warden. `js/data/monsters.js` holds 12+ monster stat/AI records plus atlas IDs and per-biome spawn rosters; the renderer gives each static frame procedural bob, squash, hit flash, elite tint, boss aura and death fade. Progression persists score, records, mutator unlocks and default character; run inventory/equipment does not survive permadeath.

## Files

```text
index.html                 screens and accessible controls
css/styles.css             responsive desktop/mobile layout
js/main.js                 UI composition, input, audio and visual effects
js/core/                   deterministic game rules, maps, combat and character data
js/data/                   classes, appearance, monsters, sprite anchors/effects and biome palettes
js/items/                  inventory stacks, equipment slots and floor drops
js/render/                 sprite loader, actors/effects, procedural biome tiles and fog
js/ui/                     cached character compositor and particle pool
assets/sprites/             normalized runtime sheets + original provided screenshots
assets/atlas.json           sprite rectangles/categories; atlas-overrides.json wins
assets/atlas-overrides.json manual sprite names/categories/boxes
tools/                      atlas generator and sprite review browser
STYLE.md                   original dungeon visual direction
js/utils/                  guarded localStorage and random-seed adapters
tests/                     Node test suites
PLANO.md                   architecture and staged checklist
```

## Verification and limitations

`node --test` currently passes **82 tests**, including the 500-seed/four-floor decorated-map checks, atlas bounds/non-overlap/transparency/rebuilds, every loot category and monster sprite ID, missing-image placeholder behavior, body/gear cache layers, FOV-clipped monster/effect rendering, inventory/equipment, particle pooling and deterministic full runs. `node --check` has been run on every JavaScript module.

This environment has no browser executable, so no visual browser/device playthrough, console check, mobile check or FPS claim is made. Static files and `tools/sprite-browser.html` have been served successfully at `http://localhost:8000`. Before considering the atlas final, open that browser and review the 221 flagged rectangles: especially joined character cells, effects crops, category guesses and the manually cut gauntlet; adjust names/categories/boxes, download the override JSON into `assets/atlas-overrides.json`, then rebuild. Also verify the full game and mobile layout in a real browser. See `PLANO.md` for remaining QA.

## Visual inspirations (not copied)

The user-provided map/character inspiration images in `/workspace/desktop/ref/` were used only for broad visual ideas and are not runtime assets. No maps, layouts, sprites or pixels were copied from them. The only image assets used are the four permitted item/effect/character sheets listed in `CREDITS.md`. All dungeon tiles, walls, lighting and HUD remain original code-drawn Canvas artwork.
