import { Rng } from "../rng.js";
import { allWalkableReachable } from "./flood-fill.js";
import { TILE } from "./tiles.js";

const DEFAULTS = Object.freeze({
  width: 60,
  height: 36,
  minLeaf: 10,
  maxLeafWidth: 23,
  maxLeafHeight: 17,
  maxDepth: 12,
});

function indexOf(map, x, y) {
  return y * map.width + x;
}

function carveRoom(map, room) {
  for (let y = room.y; y < room.y + room.height; y += 1) {
    for (let x = room.x; x < room.x + room.width; x += 1) {
      map.tiles[indexOf(map, x, y)] = TILE.FLOOR;
    }
  }
}

function carveHorizontal(map, x0, x1, y) {
  for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x += 1) {
    const index = indexOf(map, x, y);
    if (map.tiles[index] === TILE.WALL) map.tiles[index] = TILE.CORRIDOR;
  }
}

function carveVertical(map, y0, y1, x) {
  for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y += 1) {
    const index = indexOf(map, x, y);
    if (map.tiles[index] === TILE.WALL) map.tiles[index] = TILE.CORRIDOR;
  }
}

function connectRooms(map, first, second, rng) {
  const { x: ax, y: ay } = first.center;
  const { x: bx, y: by } = second.center;
  if (rng.chance(0.5)) {
    carveHorizontal(map, ax, bx, ay);
    carveVertical(map, ay, by, bx);
  } else {
    carveVertical(map, ay, by, ax);
    carveHorizontal(map, ax, bx, by);
  }
}

function makeRoom(rect, rng, id) {
  const maxWidth = Math.max(5, rect.width - 2);
  const maxHeight = Math.max(5, rect.height - 2);
  const width = rng.int(Math.min(5, maxWidth), maxWidth);
  const height = rng.int(Math.min(5, maxHeight), maxHeight);
  const x = rect.x + 1 + rng.int(0, rect.width - width - 2);
  const y = rect.y + 1 + rng.int(0, rect.height - height - 2);
  return {
    id,
    x,
    y,
    width,
    height,
    center: { x: Math.floor(x + width / 2), y: Math.floor(y + height / 2) },
  };
}

function chooseOrientation(rect, canVertical, canHorizontal, rng, options) {
  const needVertical = rect.width > options.maxLeafWidth;
  const needHorizontal = rect.height > options.maxLeafHeight;
  if (needVertical && canVertical && (!needHorizontal || !canHorizontal)) return "vertical";
  if (needHorizontal && canHorizontal && (!needVertical || !canVertical)) return "horizontal";
  if (needVertical && canVertical && needHorizontal && canHorizontal) {
    if (rect.width > rect.height * 1.25) return "vertical";
    if (rect.height > rect.width * 1.25) return "horizontal";
    return rng.chance(0.5) ? "vertical" : "horizontal";
  }
  if (!needVertical && !needHorizontal && (canVertical || canHorizontal) && rng.chance(0.18)) {
    if (canVertical && canHorizontal) return rng.chance(0.5) ? "vertical" : "horizontal";
    return canVertical ? "vertical" : "horizontal";
  }
  if (canVertical && canHorizontal) {
    return rect.width / rect.height >= 1.15 ? "vertical" : "horizontal";
  }
  if (canVertical) return "vertical";
  if (canHorizontal) return "horizontal";
  return null;
}

/**
 * Generate one connected BSP dungeon. The BSP parent connects one representative room
 * from each child; induction gives every room a route to the root representative.
 */
export function generateDungeon(seed = "ASH-001", settings = {}) {
  const options = { ...DEFAULTS, ...settings };
  for (const key of ["width", "height", "minLeaf", "maxLeafWidth", "maxLeafHeight", "maxDepth"]) {
    if (!Number.isInteger(options[key]) || options[key] <= 0) throw new RangeError(`${key} must be a positive integer`);
  }
  if (options.width < options.minLeaf * 2 + 2 || options.height < options.minLeaf * 2 + 2) {
    throw new RangeError("Dungeon dimensions are too small for the configured BSP leaf size");
  }

  const rootRng = new Rng(seed);
  const splitRng = rootRng.fork("bsp-splits");
  const roomRng = rootRng.fork("bsp-rooms");
  const corridorRng = rootRng.fork("bsp-corridors");
  const map = {
    seed: String(seed ?? 0),
    seedHash: rootRng.seed,
    width: options.width,
    height: options.height,
    tiles: new Uint8Array(options.width * options.height),
    rooms: [],
    start: null,
    stairs: null,
  };
  const rootRect = { x: 1, y: 1, width: map.width - 2, height: map.height - 2 };

  function carveNode(rect, depth) {
    if (depth < options.maxDepth) {
      const canVertical = rect.width >= options.minLeaf * 2;
      const canHorizontal = rect.height >= options.minLeaf * 2;
      const orientation = chooseOrientation(rect, canVertical, canHorizontal, splitRng, options);
      if (orientation === "vertical") {
        const split = splitRng.int(options.minLeaf, rect.width - options.minLeaf);
        const left = carveNode({ x: rect.x, y: rect.y, width: split, height: rect.height }, depth + 1);
        const right = carveNode({ x: rect.x + split, y: rect.y, width: rect.width - split, height: rect.height }, depth + 1);
        connectRooms(map, left.room, right.room, corridorRng);
        return left;
      }
      if (orientation === "horizontal") {
        const split = splitRng.int(options.minLeaf, rect.height - options.minLeaf);
        const top = carveNode({ x: rect.x, y: rect.y, width: rect.width, height: split }, depth + 1);
        const bottom = carveNode({ x: rect.x, y: rect.y + split, width: rect.width, height: rect.height - split }, depth + 1);
        connectRooms(map, top.room, bottom.room, corridorRng);
        return top;
      }
    }

    const room = makeRoom(rect, roomRng, map.rooms.length);
    map.rooms.push(room);
    carveRoom(map, room);
    return { room };
  }

  carveNode(rootRect, 0);
  map.start = { ...map.rooms[0].center };

  const distances = new Int32Array(map.tiles.length);
  distances.fill(-1);
  const queue = new Int32Array(map.tiles.length);
  let head = 0;
  let tail = 0;
  const startIndex = indexOf(map, map.start.x, map.start.y);
  distances[startIndex] = 0;
  queue[tail++] = startIndex;
  while (head < tail) {
    const current = queue[head++];
    const x = current % map.width;
    const y = Math.floor(current / map.width);
    const adjacent = [
      y > 0 ? current - map.width : -1,
      x + 1 < map.width ? current + 1 : -1,
      y + 1 < map.height ? current + map.width : -1,
      x > 0 ? current - 1 : -1,
    ];
    for (const next of adjacent) {
      if (next < 0 || distances[next] >= 0 || map.tiles[next] === TILE.WALL) continue;
      distances[next] = distances[current] + 1;
      queue[tail++] = next;
    }
  }

  let farthestRoom = map.rooms[0];
  let farthestDistance = -1;
  for (const room of map.rooms) {
    const distance = distances[indexOf(map, room.center.x, room.center.y)];
    if (distance > farthestDistance) {
      farthestDistance = distance;
      farthestRoom = room;
    }
  }
  map.stairs = { ...farthestRoom.center };
  map.tiles[indexOf(map, map.stairs.x, map.stairs.y)] = TILE.STAIRS_DOWN;

  if (!allWalkableReachable(map, map.start)) throw new Error(`BSP connectivity invariant failed for seed ${map.seed}`);
  return map;
}

/** Stable compact signature used by tests and seed-replay diagnostics. */
export function dungeonSignature(map) {
  return JSON.stringify({
    width: map.width,
    height: map.height,
    seed: map.seed,
    tiles: Array.from(map.tiles),
    rooms: map.rooms,
    start: map.start,
    stairs: map.stairs,
  });
}
