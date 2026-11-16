import test from "node:test";
import assert from "node:assert/strict";
import { BIOMES, BIOME_ORDER, FLOOR_BIOMES, biomeForFloor } from "../js/data/biomes.js";
import { findPath } from "../js/core/pathfinding.js";
import { allWalkableReachable } from "../js/core/map/flood-fill.js";
import { generateFloor } from "../js/core/map/floor.js";

function visualData(map) {
  return JSON.stringify({
    floor: map.floorNumber,
    primary: map.biomeId,
    transition: map.transitionBiomeId,
    rooms: map.rooms.map(({ id, biomeId, isTransition }) => ({ id, biomeId, isTransition })),
    biomes: map.biomeByTile,
    tiles: Array.from(map.tiles),
    decorations: map.decorations,
    hazards: map.hazards,
    lights: map.lights,
  });
}

test("all five biome data records are complete and self-contained", () => {
  assert.deepEqual(BIOME_ORDER, ["stone", "crypt", "foundry", "lava", "sanctum"]);
  for (const id of BIOME_ORDER) {
    const biome = BIOMES[id];
    assert.equal(biome.id, id);
    for (const field of ["ambient", "floor", "floorAlt", "floorMark", "corridor", "wallTop", "wallFace", "wallEdge", "seam", "accent", "deep", "light", "fog"]) {
      assert.match(biome.palette[field], /^#[0-9a-f]{6}$/i, `${id}.palette.${field}`);
    }
    assert.ok(biome.tiles.floorPattern && biome.tiles.corridorPattern);
    assert.equal(biome.tiles.wallDepth, true);
    assert.ok(Number.isFinite(biome.tiles.faceRatio) && Number.isFinite(biome.tiles.variation));
    for (const field of ["ambient", "ambientAlpha", "radius", "intensity", "vignette", "flicker"]) assert.ok(biome.lighting[field] !== undefined, `${id}.lighting.${field}`);
    for (const field of ["water", "lava", "energy", "flicker", "dust"]) assert.equal(typeof biome.animation[field], "boolean", `${id}.animation.${field}`);
    assert.ok(biome.props.length >= 3 && biome.traps.length >= 1);
    for (const prop of biome.props) {
      assert.ok(prop.id && prop.label && prop.shape && prop.placement);
      assert.equal(typeof prop.blocking, "boolean");
      assert.ok(Number.isFinite(prop.chance) && prop.chance >= 0 && prop.chance <= 1);
      if (prop.lightColor) assert.ok(prop.lightRadius > 0 && prop.lightIntensity > 0);
    }
    for (const trap of biome.traps) assert.ok(trap.id && trap.shape && trap.color && Number.isFinite(trap.damage));
  }
  assert.deepEqual(FLOOR_BIOMES, ["stone", "crypt", "foundry", "lava"]);
});

test("floor biome progression and entry-room transitions follow the declared schedule", () => {
  assert.deepEqual([1, 2, 3, 4, 8].map(biomeForFloor), ["stone", "crypt", "foundry", "lava", "lava"]);
  for (let floor = 1; floor <= 4; floor += 1) {
    const { map } = generateFloor("BIOME-TRANSITION", floor, 4);
    assert.equal(map.biomeId, FLOOR_BIOMES[floor - 1]);
    assert.equal(map.transitionBiomeId, floor === 1 ? null : FLOOR_BIOMES[floor - 2]);
    if (floor > 1) {
      assert.equal(map.rooms[0].biomeId, FLOOR_BIOMES[floor - 2]);
      assert.equal(map.rooms[0].isTransition, true);
    }
    assert.ok(map.biomeByTile.every((id) => BIOME_ORDER.includes(id)));
    if (floor === 4) assert.ok(map.rooms.some((room) => room.biomeId === "sanctum"), "boss chamber uses sanctuary theme");
  }
});

test("identical run seeds reproduce biome assignment, decoration, props and traps", () => {
  const first = generateFloor("BIOME-REPLAY", 3, 4).map;
  const second = generateFloor("BIOME-REPLAY", 3, 4).map;
  assert.equal(visualData(first), visualData(second));
  assert.notEqual(visualData(first), visualData(generateFloor("BIOME-REPLAY-OTHER", 3, 4).map));
});

test("500 seeds across all four floors preserve every room route after blocking props", { timeout: 90_000 }, () => {
  for (let seed = 0; seed < 500; seed += 1) {
    for (let floor = 1; floor <= 4; floor += 1) {
      const { map, enemies, features } = generateFloor(`BIOME-CI-${seed}`, floor, 4);
      assert.ok(allWalkableReachable(map, map.start), `seed ${seed} floor ${floor} disconnected`);
      assert.ok(findPath(map, map.start, map.stairs).length > 0, `seed ${seed} floor ${floor} stair blocked`);
      for (const room of map.rooms) assert.ok(findPath(map, map.start, room.center).length > 0, `seed ${seed} floor ${floor} room ${room.id} isolated`);
      for (const enemy of enemies) assert.ok(findPath(map, enemy, map.start).length > 0, `seed ${seed} floor ${floor} enemy stranded`);
      for (const feature of features) assert.ok(findPath(map, map.start, feature).length > 0, `seed ${seed} floor ${floor} feature isolated`);
      for (const prop of map.decorations.filter((item) => item.blocking)) {
        assert.equal(map.tiles[prop.y * map.width + prop.x], 0, "blocking prop occupies a wall cell");
        assert.equal(findPath(map, map.start, prop).length, 0, "a blocking prop is not itself a walkable goal");
      }
      for (const hazard of map.hazards) assert.equal(hazard.damage, 0, "decorative trap markers do not alter combat rules");
    }
  }
});
