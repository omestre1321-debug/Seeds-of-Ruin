import test from "node:test";
import assert from "node:assert/strict";
import { classifyWallShape, clearBiomeRenderCache, drawBiomeOverlay, getWallNeighborhood } from "../js/render/biome-renderer.js";
import { drawGame } from "../js/render/dungeon-renderer.js";
import { TILE } from "../js/core/map/tiles.js";

function mockContext(events = []) {
  const gradient = { addColorStop(...args) { events.push(["stop", ...args]); } };
  return new Proxy({ globalCompositeOperation: "source-over", globalAlpha: 1 }, {
    get(target, key) {
      if (key in target) return target[key];
      if (key === "createRadialGradient") return (...args) => { events.push(["gradient", ...args]); return gradient; };
      if (key === "rect") return (...args) => events.push(["rect", ...args]);
      if (key === "clip") return (...args) => events.push(["clip", ...args]);
      if (key === "fillRect") return (...args) => events.push(["fillRect", ...args]);
      return (...args) => events.push([key, ...args]);
    },
    set(target, key, value) { target[key] = value; events.push(["set", key, value]); return true; },
  });
}

function smallMap() {
  return {
    width: 3, height: 3, seedHash: 5, visualSeed: 19, biomeId: "crypt",
    biomeByTile: Array(9).fill("crypt"), tiles: Uint8Array.from([0, 0, 0, 0, 1, 0, 0, 0, 0]),
    start: { x: 1, y: 1 }, stairs: { x: 1, y: 1 }, decorations: [], hazards: [],
    lights: [
      { id: "visible", x: 1, y: 1, color: "#6fe4c9", radius: 4, intensity: 1, biomeId: "crypt" },
      { id: "hidden", x: 0, y: 0, color: "#6fe4c9", radius: 4, intensity: 1, biomeId: "crypt" },
    ],
  };
}

function smallState(map) {
  return {
    map, visible: Uint8Array.from([0, 0, 0, 0, 1, 0, 0, 0, 0]), explored: Uint8Array.from([0, 0, 0, 0, 1, 0, 0, 0, 0]),
    features: [], drops: [], enemies: [], player: { x: 1, y: 1, facing: "right" },
  };
}

test("wall autotiling distinguishes all cardinal neighborhoods", () => {
  const tiles = new Uint8Array(9); tiles.fill(TILE.FLOOR); tiles[4] = TILE.WALL;
  const map = { width: 3, height: 3, tiles };
  assert.equal(getWallNeighborhood(map, 1, 1), 0);
  map.tiles[1] = TILE.WALL;
  assert.equal(getWallNeighborhood(map, 1, 1), 1);
  assert.equal(classifyWallShape(0), "isolated");
  assert.equal(classifyWallShape(1), "end");
  assert.equal(classifyWallShape(5), "straight");
  assert.equal(classifyWallShape(3), "corner");
  assert.equal(classifyWallShape(7), "tee");
  assert.equal(classifyWallShape(15), "cross");
});

test("the static map layer is cached per map and tile size", () => {
  const previous = globalThis.OffscreenCanvas;
  let surfaces = 0;
  globalThis.OffscreenCanvas = class {
    constructor(width, height) { surfaces += 1; this.width = width; this.height = height; this.context = mockContext(); }
    getContext() { return this.context; }
  };
  const map = smallMap();
  clearBiomeRenderCache(map);
  try {
    drawGame(mockContext(), smallState(map), 90, 90, { drawCharacter: false });
    drawGame(mockContext(), smallState(map), 90, 90, { drawCharacter: false });
    assert.equal(surfaces, 1);
  } finally {
    clearBiomeRenderCache(map);
    if (previous === undefined) delete globalThis.OffscreenCanvas; else globalThis.OffscreenCanvas = previous;
  }
});

test("light and animated surfaces are clipped to visible tiles; reduced effects remove extra light", () => {
  const map = smallMap();
  map.biomeByTile[4] = "crypt";
  const layout = { tileSize: 10, offsetX: 7, offsetY: 9 };
  const events = [];
  drawBiomeOverlay(mockContext(events), smallState(map), layout, 450, false);
  assert.equal(events.filter(([name]) => name === "rect").length, 1);
  assert.equal(events.filter(([name]) => name === "gradient").length, 2, "only the visible source plus vignette should make gradients");
  assert.ok(events.some(([name, operation]) => name === "set" && operation === "globalCompositeOperation"));
  const reducedEvents = [];
  drawBiomeOverlay(mockContext(reducedEvents), smallState(map), layout, 450, true);
  assert.equal(reducedEvents.filter(([name]) => name === "rect").length, 1);
  assert.equal(reducedEvents.filter(([name]) => name === "gradient").length, 1, "reduced mode retains the static vignette but skips dynamic light");
  assert.ok(!reducedEvents.some(([name, operation, value]) => name === "set" && operation === "globalCompositeOperation" && value === "lighter"));
});
