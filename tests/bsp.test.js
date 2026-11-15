import test from "node:test";
import assert from "node:assert/strict";
import { allWalkableReachable, countWalkable } from "../js/core/map/flood-fill.js";
import { dungeonSignature, generateDungeon } from "../js/core/map/bsp.js";
import { TILE } from "../js/core/map/tiles.js";

test("500 deterministic BSP seeds have reachable rooms, spawn and stairs", { timeout: 20_000 }, () => {
  for (let value = 0; value < 500; value += 1) {
    const seed = `CI-${value}`;
    const map = generateDungeon(seed);
    assert.ok(map.rooms.length >= 2, `seed ${seed} should split into multiple rooms`);
    assert.ok(countWalkable(map) > map.rooms.length * 10, `seed ${seed} should produce a usable floor`);
    assert.ok(allWalkableReachable(map), `seed ${seed} contains an unreachable floor tile`);
    assert.equal(map.tiles[map.start.y * map.width + map.start.x], TILE.FLOOR);
    assert.equal(map.tiles[map.stairs.y * map.width + map.stairs.x], TILE.STAIRS_DOWN);
    for (let x = 0; x < map.width; x += 1) {
      assert.equal(map.tiles[x], TILE.WALL, `seed ${seed}: top border opened`);
      assert.equal(map.tiles[(map.height - 1) * map.width + x], TILE.WALL, `seed ${seed}: bottom border opened`);
    }
  }
});

test("the same seed produces byte-for-byte equivalent dungeon data", () => {
  const first = generateDungeon("ASH-REPLAY");
  const second = generateDungeon("ASH-REPLAY");
  assert.equal(dungeonSignature(first), dungeonSignature(second));
  assert.notEqual(dungeonSignature(first), dungeonSignature(generateDungeon("ASH-REPLAY-OTHER")));
});

test("small supported dungeons terminate and retain connectivity", () => {
  const map = generateDungeon("small", { width: 24, height: 22, minLeaf: 8, maxLeafWidth: 13, maxLeafHeight: 13 });
  assert.ok(map.rooms.length >= 2);
  assert.ok(allWalkableReachable(map));
});
