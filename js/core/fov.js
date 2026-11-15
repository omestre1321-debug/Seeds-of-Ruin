import { inBounds } from "./map/flood-fill.js";
import { TILE } from "./map/tiles.js";

function lineVisible(fromX, fromY, toX, toY, opaque) {
  let x = fromX;
  let y = fromY;
  const dx = Math.abs(toX - fromX);
  const dy = Math.abs(toY - fromY);
  const stepX = fromX < toX ? 1 : -1;
  const stepY = fromY < toY ? 1 : -1;
  let error = dx - dy;

  while (x !== toX || y !== toY) {
    const twiceError = error * 2;
    if (twiceError > -dy) { error -= dy; x += stepX; }
    if (twiceError < dx) { error += dx; y += stepY; }
    // Opaque destination tiles remain visible; only cells before the target block the ray.
    if (x === toX && y === toY) return true;
    if (opaque(x, y)) return false;
  }
  return true;
}

/** Raycast to each cell in a circular radius. Pure data in, byte visibility mask out. */
export function computeFov(map, origin, radius = 8, options = {}) {
  if (!Number.isInteger(radius) || radius < 0) throw new RangeError("FOV radius must be a non-negative integer");
  const visible = new Uint8Array(map.width * map.height);
  if (!inBounds(map, origin.x, origin.y)) return visible;
  const opaque = options.isOpaque ?? ((x, y) => map.tiles[y * map.width + x] === TILE.WALL);
  const radiusSquared = radius * radius;
  const minX = Math.max(0, origin.x - radius);
  const maxX = Math.min(map.width - 1, origin.x + radius);
  const minY = Math.max(0, origin.y - radius);
  const maxY = Math.min(map.height - 1, origin.y + radius);
  visible[origin.y * map.width + origin.x] = 1;

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      const dx = x - origin.x;
      const dy = y - origin.y;
      if (dx * dx + dy * dy > radiusSquared) continue;
      if (lineVisible(origin.x, origin.y, x, y, opaque)) visible[y * map.width + x] = 1;
    }
  }
  return visible;
}

/** Merge current visibility into persistent exploration without changing either input. */
export function mergeExplored(previous, visible) {
  if (previous.length !== visible.length) throw new RangeError("FOV masks must have identical dimensions");
  const explored = new Uint8Array(previous.length);
  for (let index = 0; index < previous.length; index += 1) explored[index] = previous[index] || visible[index] ? 1 : 0;
  return explored;
}
