function freeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) freeze(child);
  return Object.freeze(value);
}

export const BIOME_ORDER = Object.freeze(["stone", "crypt", "foundry", "lava", "sanctum"]);
export const FLOOR_BIOMES = Object.freeze(["stone", "crypt", "foundry", "lava"]);

// Visual-only data. The renderer interprets these descriptors; simulation rules stay in core.
export const BIOMES = freeze({
  stone: {
    id: "stone", label: "Basalt Halls",
    palette: {
      ambient: "#19232a", floor: "#46545d", floorAlt: "#53616a", floorMark: "#65717a",
      corridor: "#3b4b54", wallTop: "#27343c", wallFace: "#35444c", wallEdge: "#71808a",
      seam: "#1d282f", accent: "#d49a5f", deep: "#10171c", light: "#f1a75e", fog: "#090d11",
    },
    tiles: { floorPattern: "stone-speckle", corridorPattern: "worn-joint", wallDepth: true, faceRatio: 0.34, variation: 0.18 },
    lighting: { ambient: "#91a9b8", ambientAlpha: 0.12, radius: 4.2, intensity: 0.48, vignette: 0.46, flicker: 0.16 },
    animation: { water: false, lava: false, energy: false, flicker: true, dust: true },
    props: [
      { id: "amber-sconce", label: "Sconce", shape: "sconce", placement: "wall", chance: 0.58, blocking: false, color: "#b86f3d", lightColor: "#ffad5f", lightRadius: 4.4, lightIntensity: 0.82, animation: "flame", glow: 0.55 },
      { id: "iron-grille", label: "Iron grille", shape: "grille", placement: "wall", chance: 0.22, blocking: false, color: "#7e9195", glow: 0 },
      { id: "masonry-rubble", label: "Masonry rubble", shape: "rubble", placement: "interior", chance: 0.28, blocking: true, color: "#849098", glow: 0 },
      { id: "old-coffer", label: "Old coffer", shape: "coffer", placement: "interior", chance: 0.16, blocking: false, color: "#b98757", glow: 0.08 },
    ],
    traps: [{ id: "floor-spikes", label: "Dormant spike plate", shape: "spikes", chance: 0.14, color: "#9baab0", damage: 0 }],
  },
  crypt: {
    id: "crypt", label: "The Quiet Sepulcher",
    palette: {
      ambient: "#172322", floor: "#403e3a", floorAlt: "#514c43", floorMark: "#777264",
      corridor: "#373b38", wallTop: "#292e2b", wallFace: "#403c35", wallEdge: "#8b897b",
      seam: "#202926", accent: "#8fc5ae", deep: "#0c1413", light: "#79d9c4", fog: "#080d0e",
    },
    tiles: { floorPattern: "crypt-dust", corridorPattern: "burial-seam", wallDepth: true, faceRatio: 0.38, variation: 0.2 },
    lighting: { ambient: "#70b6a6", ambientAlpha: 0.12, radius: 4.5, intensity: 0.62, vignette: 0.57, flicker: 0.1 },
    animation: { water: true, lava: false, energy: false, flicker: true, dust: true },
    props: [
      { id: "blue-wick", label: "Blue wick", shape: "flame-bowl", placement: "wall", chance: 0.48, blocking: false, color: "#467e79", lightColor: "#71ebd0", lightRadius: 4.1, lightIntensity: 0.9, animation: "flame", glow: 0.68 },
      { id: "sealed-sarcophagus", label: "Sealed sarcophagus", shape: "sarcophagus", placement: "interior", chance: 0.24, blocking: true, color: "#aaa18b", glow: 0 },
      { id: "bone-scatter", label: "Bone scatter", shape: "bones", placement: "floor", chance: 0.48, blocking: false, color: "#c9c2aa", glow: 0 },
      { id: "water-seam", label: "Still water seam", shape: "water", placement: "floor", chance: 0.24, blocking: false, color: "#3caaa0", animation: "water", glow: 0.18 },
    ],
    traps: [{ id: "bone-latch", label: "Buried bone latch", shape: "spikes", chance: 0.12, color: "#9f8c6f", damage: 0 }],
  },
  foundry: {
    id: "foundry", label: "Buried Thermal Foundry",
    palette: {
      ambient: "#1b2026", floor: "#39434b", floorAlt: "#465057", floorMark: "#69747a",
      corridor: "#303b42", wallTop: "#242d33", wallFace: "#384047", wallEdge: "#788288",
      seam: "#202a31", accent: "#6fd0cc", deep: "#0b1016", light: "#8de6dd", fog: "#080b10",
    },
    tiles: { floorPattern: "segmented-plate", corridorPattern: "conduit-joint", wallDepth: true, faceRatio: 0.32, variation: 0.13 },
    lighting: { ambient: "#8dc7d0", ambientAlpha: 0.1, radius: 4.8, intensity: 0.68, vignette: 0.55, flicker: 0.08 },
    animation: { water: false, lava: false, energy: true, flicker: false, dust: false },
    props: [
      { id: "heat-core", label: "Heat core", shape: "core", placement: "interior", chance: 0.3, blocking: false, color: "#cb8e50", lightColor: "#73e3dd", lightRadius: 4.2, lightIntensity: 0.8, animation: "energy", glow: 0.72 },
      { id: "service-terminal", label: "Service terminal", shape: "terminal", placement: "wall", chance: 0.34, blocking: false, color: "#70b6bd", glow: 0.22 },
      { id: "copper-conduit", label: "Copper conduit", shape: "conduit", placement: "wall", chance: 0.42, blocking: false, color: "#bc8055", glow: 0 },
      { id: "machine-column", label: "Machine column", shape: "pillar", placement: "interior", chance: 0.18, blocking: true, color: "#69767b", glow: 0 },
    ],
    traps: [{ id: "arc-grid", label: "Dormant arc grid", shape: "arcs", chance: 0.15, color: "#79d9d2", damage: 0 }],
  },
  lava: {
    id: "lava", label: "Cinderflow Cavern",
    palette: {
      ambient: "#241817", floor: "#332c2b", floorAlt: "#413332", floorMark: "#6c4740",
      corridor: "#2e2829", wallTop: "#1c2023", wallFace: "#342c2a", wallEdge: "#76544a",
      seam: "#201a1a", accent: "#ef874b", deep: "#0c0d10", light: "#ff873f", fog: "#09090b",
    },
    tiles: { floorPattern: "basalt-crackle", corridorPattern: "cinder-run", wallDepth: true, faceRatio: 0.4, variation: 0.22 },
    lighting: { ambient: "#d77b54", ambientAlpha: 0.11, radius: 5.2, intensity: 0.72, vignette: 0.64, flicker: 0.24 },
    animation: { water: false, lava: true, energy: false, flicker: true, dust: true },
    props: [
      { id: "magma-fissure", label: "Magma fissure", shape: "lava", placement: "floor", chance: 0.34, blocking: false, color: "#ee6c39", lightColor: "#ff7438", lightRadius: 4.8, lightIntensity: 0.92, animation: "lava", glow: 0.8 },
      { id: "cinder-vent", label: "Cinder vent", shape: "vent", placement: "wall", chance: 0.36, blocking: false, color: "#6e453d", lightColor: "#f08a49", lightRadius: 3.8, lightIntensity: 0.64, animation: "flame", glow: 0.52 },
      { id: "basalt-spur", label: "Basalt spur", shape: "pillar", placement: "interior", chance: 0.2, blocking: true, color: "#555053", glow: 0 },
      { id: "ember-pile", label: "Ember clinker", shape: "rubble", placement: "floor", chance: 0.38, blocking: false, color: "#aa6042", glow: 0.15 },
    ],
    traps: [{ id: "crust-spikes", label: "Cooled crust spikes", shape: "spikes", chance: 0.18, color: "#e17848", damage: 0 }],
  },
  sanctum: {
    id: "sanctum", label: "The Ashen Sanctuary",
    palette: {
      ambient: "#202127", floor: "#514c4c", floorAlt: "#62585a", floorMark: "#8c7b79",
      corridor: "#403d43", wallTop: "#302f38", wallFace: "#484148", wallEdge: "#a3948a",
      seam: "#2b2931", accent: "#d4b778", deep: "#101015", light: "#e4c687", fog: "#09090d",
    },
    tiles: { floorPattern: "ash-mosaic", corridorPattern: "votive-seam", wallDepth: true, faceRatio: 0.36, variation: 0.16 },
    lighting: { ambient: "#b5a2bc", ambientAlpha: 0.13, radius: 4.6, intensity: 0.6, vignette: 0.56, flicker: 0.12 },
    animation: { water: false, lava: false, energy: false, flicker: true, dust: true },
    props: [
      { id: "votive-candle", label: "Votive candle", shape: "candle", placement: "wall", chance: 0.56, blocking: false, color: "#e3c98d", lightColor: "#ffdda0", lightRadius: 3.6, lightIntensity: 0.58, animation: "flame", glow: 0.46 },
      { id: "broken-pillar", label: "Broken pillar", shape: "pillar", placement: "interior", chance: 0.28, blocking: true, color: "#a89c91", glow: 0 },
      { id: "ruined-shelf", label: "Ruined shelf", shape: "shelf", placement: "wall", chance: 0.36, blocking: false, color: "#8d7465", glow: 0 },
      { id: "glass-fragment", label: "Glass fragment", shape: "glass", placement: "floor", chance: 0.32, blocking: false, color: "#b386b5", glow: 0.22 },
    ],
    traps: [{ id: "votive-trap", label: "Dormant votive snare", shape: "spikes", chance: 0.1, color: "#c5a873", damage: 0 }],
  },
});

export function biomeForFloor(floorNumber) {
  const index = Math.max(0, Math.min(FLOOR_BIOMES.length - 1, Math.floor(floorNumber) - 1));
  return FLOOR_BIOMES[index];
}
