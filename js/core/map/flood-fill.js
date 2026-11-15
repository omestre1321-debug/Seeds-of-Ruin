import { TILE } from "./tiles.js";

export function inBounds(map, x, y) {
  return Number.isInteger(x) && Number.isInteger(y) && x >= 0 && y >= 0 && x < map.width && y < map.height;
}

export function isWalkable(map, x, y) {
  return inBounds(map, x, y) && map.tiles[y * map.width + x] !== TILE.WALL;
}

/** Return a byte mask of the cardinally reachable floor from one start cell. */
export function floodFill(map, start) {
  const size = map.width * map.height;
  const reached = new Uint8Array(size);
  if (!isWalkable(map, start.x, start.y)) return reached;

  const queue = new Int32Array(size);
  let head = 0;
  let tail = 0;
  const first = start.y * map.width + start.x;
  queue[tail++] = first;
  reached[first] = 1;

  while (head < tail) {
    const index = queue[head++];
    const x = index % map.width;
    const y = Math.floor(index / map.width);
    const neighbors = [
      y > 0 ? index - map.width : -1,
      x + 1 < map.width ? index + 1 : -1,
      y + 1 < map.height ? index + map.width : -1,
      x > 0 ? index - 1 : -1,
    ];
    for (const next of neighbors) {
      if (next < 0 || reached[next] || map.tiles[next] === TILE.WALL) continue;
      reached[next] = 1;
      queue[tail++] = next;
    }
  }
  return reached;
}

export function countWalkable(map) {
  let count = 0;
  for (const tile of map.tiles) if (tile !== TILE.WALL) count += 1;
  return count;
}

export function allWalkableReachable(map, start = map.start) {
  const reached = floodFill(map, start);
  return reached.reduce((sum, value) => sum + value, 0) === countWalkable(map);
}
