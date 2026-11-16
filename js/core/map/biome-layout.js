import { BIOMES, BIOME_ORDER, biomeForFloor } from "../../data/biomes.js";
import { Rng } from "../rng.js";
import { TILE } from "./tiles.js";
import { allWalkableReachable } from "./flood-fill.js";

const CARDINAL = Object.freeze([[0, -1], [1, 0], [0, 1], [-1, 0]]);
const indexOf = (map, x, y) => y * map.width + x;

function pathMask(map, start, goal) {
  const parent = new Int32Array(map.tiles.length);
  parent.fill(-1);
  const first = indexOf(map, start.x, start.y);
  const target = indexOf(map, goal.x, goal.y);
  const queue = new Int32Array(map.tiles.length);
  let head = 0;
  let tail = 0;
  queue[tail++] = first;
  parent[first] = first;
  while (head < tail && parent[target] < 0) {
    const current = queue[head++];
    const x = current % map.width;
    const y = Math.floor(current / map.width);
    for (const [dx, dy] of CARDINAL) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
      const next = indexOf(map, nx, ny);
      if (parent[next] >= 0 || map.tiles[next] === TILE.WALL) continue;
      parent[next] = current;
      queue[tail++] = next;
    }
  }
  if (parent[target] < 0) return null;
  const mask = new Uint8Array(map.tiles.length);
  let cursor = target;
  while (cursor !== first) {
    mask[cursor] = 1;
    cursor = parent[cursor];
  }
  mask[first] = 1;
  return mask;
}

function buildProtectedRoute(map) {
  const protectedCells = new Uint8Array(map.tiles.length);
  const targets = [...map.rooms.map((room) => room.center), map.stairs];
  for (const target of targets) {
    const route = pathMask(map, map.start, target);
    if (!route) throw new Error(`No protected route to ${target.x},${target.y}`);
    for (let index = 0; index < route.length; index += 1) protectedCells[index] |= route[index];
  }
  return protectedCells;
}

function setRoomBiomes(map, floorNumber, features) {
  const primary = biomeForFloor(floorNumber);
  const transition = floorNumber > 1 ? biomeForFloor(floorNumber - 1) : null;
  const featureByCenter = new Map(features.map((feature) => [`${feature.x},${feature.y}`, feature]));
  for (const room of map.rooms) {
    const feature = featureByCenter.get(`${room.center.x},${room.center.y}`);
    const special = feature && ["event", "treasure", "boss"].includes(feature.type) ? "sanctum" : null;
    room.biomeId = special ?? (room.id === 0 && transition ? transition : primary);
    room.isTransition = room.id === 0 && Boolean(transition) && !special;
    if (feature) {
      feature.biomeId = room.biomeId;
      feature.theme = special ? "sanctum" : null;
    }
  }
  return { primary, transition };
}

function assignTileBiomes(map) {
  const biomes = Array(map.tiles.length).fill(null);
  const queue = new Int32Array(map.tiles.length);
  let tail = 0;
  for (const room of map.rooms) {
    for (let y = room.y; y < room.y + room.height; y += 1) {
      for (let x = room.x; x < room.x + room.width; x += 1) {
        const index = indexOf(map, x, y);
        if (map.tiles[index] === TILE.WALL) continue;
        biomes[index] = room.biomeId;
        queue[tail++] = index;
      }
    }
  }
  let head = 0;
  while (head < tail) {
    const current = queue[head++];
    const x = current % map.width;
    const y = Math.floor(current / map.width);
    for (const [dx, dy] of CARDINAL) {
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= map.width || ny >= map.height) continue;
      const next = indexOf(map, nx, ny);
      if (map.tiles[next] === TILE.WALL || biomes[next]) continue;
      biomes[next] = biomes[current];
      queue[tail++] = next;
    }
  }
  for (let index = 0; index < biomes.length; index += 1) {
    if (!biomes[index]) biomes[index] = map.biomeId;
  }
  return biomes;
}

function belongsToRoom(room, x, y) {
  return x >= room.x && y >= room.y && x < room.x + room.width && y < room.y + room.height;
}

function propCandidates(map, room, rule, protectedCells, reserved) {
  const cells = [];
  for (let y = room.y; y < room.y + room.height; y += 1) {
    for (let x = room.x; x < room.x + room.width; x += 1) {
      const index = indexOf(map, x, y);
      if (map.tiles[index] !== TILE.FLOOR || protectedCells[index] || reserved.has(index)) continue;
      if (rule.placement === "interior" && (x <= room.x || y <= room.y || x >= room.x + room.width - 1 || y >= room.y + room.height - 1)) continue;
      if (rule.placement === "wall") {
        const touchesWall = CARDINAL.some(([dx, dy]) => !belongsToRoom(room, x + dx, y + dy) || map.tiles[indexOf(map, x + dx, y + dy)] === TILE.WALL);
        if (!touchesWall) continue;
      }
      cells.push({ x, y, index });
    }
  }
  return cells;
}

function addEnvironment(map, seed, features, enemies) {
  const rng = new Rng(`${seed}::biome-decoration`);
  const protectedCells = buildProtectedRoute(map);
  const reserved = new Set();
  for (const position of [map.start, map.stairs, ...features, ...enemies]) {
    if (Number.isInteger(position.x) && Number.isInteger(position.y)) reserved.add(indexOf(map, position.x, position.y));
  }
  const decorations = [];
  const hazards = [];
  const lights = [];
  let serial = 0;
  for (const room of map.rooms) {
    const biome = BIOMES[room.biomeId];
    for (const rule of biome.props) {
      if (!rng.chance(rule.chance)) continue;
      const candidates = propCandidates(map, room, rule, protectedCells, reserved);
      if (candidates.length === 0) continue;
      const position = rng.pick(candidates);
      reserved.add(position.index);
      if (rule.blocking) map.tiles[position.index] = TILE.WALL;
      const decoration = {
        id: `f${map.floorNumber}-r${room.id}-${rule.id}-${serial++}`,
        type: rule.id, label: rule.label, shape: rule.shape,
        biomeId: room.biomeId, x: position.x, y: position.y,
        blocking: Boolean(rule.blocking), color: rule.color, glow: rule.glow ?? 0,
        animation: rule.animation ?? null,
        lightColor: rule.lightColor ?? null,
        lightRadius: rule.lightRadius ?? 0,
        lightIntensity: rule.lightIntensity ?? 0,
      };
      decorations.push(decoration);
      if (decoration.lightColor) lights.push({ id: decoration.id, x: decoration.x, y: decoration.y, color: decoration.lightColor, radius: decoration.lightRadius, intensity: decoration.lightIntensity, animation: decoration.animation });
    }
    for (const rule of biome.traps) {
      if (!rng.chance(rule.chance)) continue;
      const candidates = propCandidates(map, room, { placement: "floor" }, protectedCells, reserved);
      if (candidates.length === 0) continue;
      const position = rng.pick(candidates);
      reserved.add(position.index);
      hazards.push({
        id: `f${map.floorNumber}-r${room.id}-${rule.id}-${serial++}`,
        type: rule.id, label: rule.label, shape: rule.shape, biomeId: room.biomeId,
        x: position.x, y: position.y, color: rule.color, damage: rule.damage,
      });
    }
  }
  map.decorations = decorations;
  map.hazards = hazards;
  map.lights = lights;
  if (!allWalkableReachable(map, map.start)) throw new Error(`Biome obstacle disconnected floor ${map.floorNumber} (${map.seed})`);
  return { protectedCells, decorations, hazards, lights };
}

/** Add deterministic room palettes and decorative geometry without consuming the gameplay stream. */
export function generateBiomeLayout(map, { floorNumber, maxFloors = 4, seed = map.seed, features = [], enemies = [] } = {}) {
  if (!Number.isInteger(floorNumber) || floorNumber < 1) throw new RangeError("floorNumber must be a positive integer");
  map.floorNumber = floorNumber;
  map.maxFloors = maxFloors;
  const { primary, transition } = setRoomBiomes(map, floorNumber, features);
  map.biomeId = primary;
  map.transitionBiomeId = transition;
  map.biomeByTile = assignTileBiomes(map);
  const { decorations, hazards, lights } = addEnvironment(map, seed, features, enemies);
  // The assignment was made before blocking props; their cells retain their room's palette.
  map.biomeByTile = map.biomeByTile.map((biomeId, index) => map.tiles[index] === TILE.WALL ? biomeId ?? primary : biomeId ?? primary);
  map.visualSeed = new Rng(`${seed}::biome-visual`).seed;
  map.visualSignature = JSON.stringify({
    floorNumber, primary, transition, biomeByTile: map.biomeByTile,
    decorations, hazards,
  });
  return { biomeId: primary, transitionBiomeId: transition, decorations, hazards, lights };
}

export { BIOME_ORDER, BIOMES, biomeForFloor, pathMask as findUnobstructedRoute };
