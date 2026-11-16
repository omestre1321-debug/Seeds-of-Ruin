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

`js/ui/particles.js` is independent of the turn simulation. It uses declarative presets, delta-time updates and a reusable object pool capped at 500. Presets cover rarity-colored drop glints/bursts, pickup trails, equip aura, damage/death sparks, ambient embers and stair spirals. World-bound effects are emitted/drawn only for visible tiles. The **Reduced visual effects** menu option is saved separately in localStorage and lowers the effect rate; particles never advance a turn.

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
js/data/                   classes, appearance options and item visual descriptors
js/items/                  inventory stacks, equipment slots and floor drops
js/render/                 Canvas map/minimap drawing
js/ui/                     character compositor and particle pool
js/utils/                  guarded localStorage and random-seed adapters
tests/                     Node test suites
PLANO.md                   architecture and staged checklist
```

## Verification and limitations

`node --test` currently passes **51 tests**, including 500 deterministic dungeon seeds, RNG/path/FOV, all class/appearance combinations, drop pickup/full pack, stack quantities, gear swap/blocked swap/stat recalculation, equipment layer caching, particle-pool reuse, seed independence, storage fallbacks, and a scripted full run. `node --check` has been run on all modules.

This environment has no browser executable, so no visual browser/device playthrough is claimed. The static page is served locally at `http://localhost:8000` and responds successfully; the menu-to-character-to-game flow, touch hit areas, audio policy, color contrast and Canvas cache performance still need verification in an actual browser. A deterministic loot-seeking balance smoke test is part of Node tests; manual tuning remains open. See `PLANO.md` for checklist and remaining QA.

## Inspiration credits and originality

The user-provided images under `/workspace/desktop/ref/` were viewed only for broad visual ideas: compact pixel-scale readability and distinct facing/equipment silhouettes (`images _1_.jpg`, `images _2_.jpg`, `images _3_.jpg`, `images.png`). They contain character imagery, not inventory or particle-system designs. No source, pixel arrangement, sprite, name, character, text, sound or asset was copied. All shapes, class/item names, palettes, UI, animations and effects were created for Ashen Reach. The equipment-slot panel follows the requested general RPG paper-doll idea, not a copied game screen.
