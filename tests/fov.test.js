import test from "node:test";
import assert from "node:assert/strict";
import { computeFov, mergeExplored } from "../js/core/fov.js";
import { TILE } from "../js/core/map/tiles.js";

function openMap(width, height) {
  return { width, height, tiles: new Uint8Array(width * height).fill(TILE.FLOOR) };
}

test("raycast FOV includes the origin, respects radius and reveals an opaque wall", () => {
  const map = openMap(9, 7);
  map.tiles[3 * map.width + 4] = TILE.WALL;
  const origin = { x: 2, y: 3 };
  const visible = computeFov(map, origin, 5);
  assert.equal(visible[origin.y * map.width + origin.x], 1);
  assert.equal(visible[3 * map.width + 4], 1, "the blocking wall itself is visible");
  assert.equal(visible[3 * map.width + 5], 0, "tiles directly behind a wall are hidden");
  assert.equal(visible[8], 0, "cells outside the circular radius are hidden");
});

test("exploration merges immutably and maintains prior discoveries", () => {
  const explored = new Uint8Array([1, 0, 0, 1]);
  const visible = new Uint8Array([0, 1, 0, 0]);
  const merged = mergeExplored(explored, visible);
  assert.deepEqual(Array.from(merged), [1, 1, 0, 1]);
  assert.deepEqual(Array.from(explored), [1, 0, 0, 1]);
  assert.throws(() => mergeExplored(explored, new Uint8Array(3)), RangeError);
});
