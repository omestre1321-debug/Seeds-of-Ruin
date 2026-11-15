import { createEnemy, ENEMY_TYPES } from "../enemies.js";
import { Rng } from "../rng.js";
import { applyEnemyMutator } from "../mutators.js";
import { generateDungeon } from "./bsp.js";
import { TILE } from "./tiles.js";

function positionKey(position) {
  return `${position.x},${position.y}`;
}

function roomCandidates(map) {
  const startKey = positionKey(map.start);
  const stairsKey = positionKey(map.stairs);
  return map.rooms.filter((room) => {
    const key = positionKey(room.center);
    return key !== startKey && key !== stairsKey;
  });
}

function placeFeature(map, room, type, data = {}) {
  const position = { ...room.center };
  map.tiles[position.y * map.width + position.x] = type === "shop" ? TILE.SHOP : type === "treasure" ? TILE.TREASURE : type === "event" ? TILE.EVENT : TILE.BOSS;
  return { id: `${type}-${position.x}-${position.y}`, type, ...position, ...data };
}

function chooseEnemyType(rng, floor, isFinal) {
  if (isFinal && rng.chance(0.12)) return ENEMY_TYPES.WRAITH;
  const roll = rng.next();
  if (roll < 0.34) return ENEMY_TYPES.SENTRY;
  if (roll < 0.68) return ENEMY_TYPES.WOLF;
  return ENEMY_TYPES.WRAITH;
}

function roomSpawnCells(map, room, reserved) {
  const cells = [];
  for (let y = room.y; y < room.y + room.height; y += 1) {
    for (let x = room.x; x < room.x + room.width; x += 1) {
      const key = positionKey({ x, y });
      if (map.tiles[y * map.width + x] !== TILE.WALL && !reserved.has(key)) cells.push({ x, y });
    }
  }
  return cells;
}

/** Deterministically add floor content and enemy placements to a BSP layout. */
export function generateFloor(runSeed, floorNumber, maxFloors = 4, options = {}) {
  if (!Number.isInteger(floorNumber) || floorNumber < 1 || !Number.isInteger(maxFloors) || maxFloors < 1 || floorNumber > maxFloors) {
    throw new RangeError("Floor number must be between 1 and maxFloors");
  }
  const floorSeed = `${String(runSeed)}::floor-${floorNumber}`;
  const map = generateDungeon(floorSeed, options.map);
  const rng = new Rng(floorSeed).fork("floor-content");
  const features = [];
  const candidates = roomCandidates(map);
  const featureRooms = [...candidates];
  const isFinal = floorNumber === maxFloors;

  if (featureRooms.length > 0) features.push(placeFeature(map, featureRooms.shift(), "shop", { stockSeed: rng.nextUint32() }));
  if (featureRooms.length > 0) features.push(placeFeature(map, featureRooms.shift(), "treasure", { gold: 10 + floorNumber * 7, guaranteedTonic: floorNumber === 1 }));
  if (featureRooms.length > 0) features.push(placeFeature(map, featureRooms.shift(), "event", { eventSeed: rng.nextUint32() }));

  const reserved = new Set([positionKey(map.start), positionKey(map.stairs), ...features.map(positionKey)]);
  const spawnRooms = featureRooms.length > 0 ? featureRooms : candidates;
  const shuffledRooms = [...spawnRooms];
  for (let index = shuffledRooms.length - 1; index > 0; index -= 1) {
    const swap = rng.int(0, index);
    [shuffledRooms[index], shuffledRooms[swap]] = [shuffledRooms[swap], shuffledRooms[index]];
  }

  const enemyCount = Math.min(2 + floorNumber, Math.max(0, shuffledRooms.length));
  const enemies = [];
  const spawnRng = rng.fork("enemy-positions");
  for (let index = 0; index < enemyCount; index += 1) {
    const room = shuffledRooms[index];
    const cells = roomSpawnCells(map, room, reserved);
    if (cells.length === 0) continue;
    const position = spawnRng.pick(cells);
    reserved.add(positionKey(position));
    const type = chooseEnemyType(spawnRng, floorNumber, isFinal);
    const enemy = createEnemy(type, `f${floorNumber}-e${index}`, position, floorNumber, room);
    applyEnemyMutator(enemy, options.mutator ?? {});
    enemies.push(enemy);
  }

  if (isFinal) {
    map.tiles[map.stairs.y * map.width + map.stairs.x] = TILE.BOSS;
    const boss = createEnemy(ENEMY_TYPES.BOSS, `f${floorNumber}-boss`, map.stairs, floorNumber, map.rooms.find((room) => positionKey(room.center) === positionKey(map.stairs)) ?? null);
    applyEnemyMutator(boss, options.mutator ?? {});
    enemies.push(boss);
    features.push({ id: "vault-boss", type: "boss", ...map.stairs, enemyId: boss.id });
  }

  if (floorNumber > 1) map.tiles[map.start.y * map.width + map.start.x] = TILE.STAIRS_UP;
  return { floor: floorNumber, maxFloors, seed: floorSeed, map, features, enemies, bossDefeated: false };
}
