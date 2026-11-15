import { inBounds, isWalkable } from "./map/flood-fill.js";

const STEPS = Object.freeze([[0, -1], [1, 0], [0, 1], [-1, 0]]);

class MinHeap {
  constructor() { this.values = []; }
  get size() { return this.values.length; }

  push(value) {
    const values = this.values;
    let index = values.length;
    values.push(value);
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (MinHeap.compare(values[parent], value) <= 0) break;
      values[index] = values[parent];
      index = parent;
    }
    values[index] = value;
  }

  pop() {
    const values = this.values;
    if (values.length === 0) return undefined;
    const first = values[0];
    const last = values.pop();
    if (values.length > 0) {
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        if (left >= values.length) break;
        let child = left;
        if (right < values.length && MinHeap.compare(values[right], values[left]) < 0) child = right;
        if (MinHeap.compare(values[child], last) >= 0) break;
        values[index] = values[child];
        index = child;
      }
      values[index] = last;
    }
    return first;
  }

  static compare(a, b) {
    return a.f - b.f || a.h - b.h || a.index - b.index || a.g - b.g;
  }
}

function manhattan(x1, y1, x2, y2) {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}

/**
 * Cardinal-grid A*. Returns a path including start and goal, or [] when no route exists.
 * Neighbor and heap tie-break ordering is stable, so a given map always yields one path.
 */
export function findPath(map, start, goal, options = {}) {
  const canWalk = options.isWalkable ?? ((x, y) => isWalkable(map, x, y));
  if (!inBounds(map, start.x, start.y) || !inBounds(map, goal.x, goal.y)) return [];
  if (!canWalk(start.x, start.y) || !canWalk(goal.x, goal.y)) return [];
  if (start.x === goal.x && start.y === goal.y) return [{ x: start.x, y: start.y }];

  const size = map.width * map.height;
  const startIndex = start.y * map.width + start.x;
  const goalIndex = goal.y * map.width + goal.x;
  const costs = new Float64Array(size);
  costs.fill(Number.POSITIVE_INFINITY);
  const parents = new Int32Array(size);
  parents.fill(-1);
  const closed = new Uint8Array(size);
  const open = new MinHeap();
  const initialH = manhattan(start.x, start.y, goal.x, goal.y);
  costs[startIndex] = 0;
  open.push({ index: startIndex, g: 0, h: initialH, f: initialH });

  while (open.size > 0) {
    const current = open.pop();
    if (closed[current.index] || current.g !== costs[current.index]) continue;
    if (current.index === goalIndex) {
      const reversed = [];
      let index = goalIndex;
      while (index >= 0) {
        reversed.push({ x: index % map.width, y: Math.floor(index / map.width) });
        if (index === startIndex) break;
        index = parents[index];
      }
      if (reversed.at(-1)?.x !== start.x || reversed.at(-1)?.y !== start.y) return [];
      return reversed.reverse();
    }

    closed[current.index] = 1;
    const x = current.index % map.width;
    const y = Math.floor(current.index / map.width);
    for (const [dx, dy] of STEPS) {
      const nx = x + dx;
      const ny = y + dy;
      if (!inBounds(map, nx, ny) || !canWalk(nx, ny)) continue;
      const next = ny * map.width + nx;
      if (closed[next]) continue;
      const nextCost = current.g + 1;
      if (nextCost >= costs[next]) continue;
      costs[next] = nextCost;
      parents[next] = current.index;
      const h = manhattan(nx, ny, goal.x, goal.y);
      open.push({ index: next, g: nextCost, h, f: nextCost + h });
    }
  }
  return [];
}
