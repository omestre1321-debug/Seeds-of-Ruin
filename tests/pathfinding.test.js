import test from "node:test";
import assert from "node:assert/strict";
import { findPath } from "../js/core/pathfinding.js";
import { TILE } from "../js/core/map/tiles.js";

function mapFromRows(rows) {
  const width = rows[0].length;
  return { width, height: rows.length, tiles: Uint8Array.from(rows.join("").split("").map((c) => c === "#" ? TILE.WALL : TILE.FLOOR)) };
}

test("A* finds a legal cardinal route when one exists", () => {
  const map = mapFromRows(["########", "#......#", "#.##...#", "#......#", "########"]);
  const path = findPath(map, { x: 1, y: 1 }, { x: 6, y: 3 });
  assert.ok(path.length > 0);
  assert.deepEqual(path[0], { x: 1, y: 1 });
  assert.deepEqual(path.at(-1), { x: 6, y: 3 });
  for (let index = 1; index < path.length; index += 1) {
    const previous = path[index - 1];
    const current = path[index];
    assert.equal(Math.abs(previous.x - current.x) + Math.abs(previous.y - current.y), 1);
    assert.notEqual(map.tiles[current.y * map.width + current.x], TILE.WALL);
  }
});

test("A* returns an empty path for disconnected cells and walls", () => {
  const map = mapFromRows(["#####", "#.#.#", "#####"]);
  assert.deepEqual(findPath(map, { x: 1, y: 1 }, { x: 3, y: 1 }), []);
  assert.deepEqual(findPath(map, { x: 1, y: 1 }, { x: 2, y: 1 }), []);
  assert.deepEqual(findPath(map, { x: -1, y: 1 }, { x: 3, y: 1 }), []);
});

test("A* gives a stable route for fixed input and a singleton for same-cell", () => {
  const map = mapFromRows([".......", ".......", "......."]);
  const start = { x: 0, y: 0 };
  const goal = { x: 6, y: 2 };
  assert.deepEqual(findPath(map, start, goal), findPath(map, start, goal));
  assert.deepEqual(findPath(map, start, start), [start]);
});
