import { BIOMES } from "../data/biomes.js";
import { TILE } from "../core/map/tiles.js";

const CARDINAL_BITS = Object.freeze([1, 2, 4, 8]); // north, east, south, west
const CARDINAL = Object.freeze([[0, -1], [1, 0], [0, 1], [-1, 0]]);
const layerCache = new WeakMap();

function cellHash(map, x, y, salt = 0) {
  let value = (map.visualSeed ?? map.seedHash ?? 1) ^ Math.imul(x + 0x9e37, 0x85ebca6b) ^ Math.imul(y + 0x7f4a, 0xc2b2ae35) ^ salt;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return ((value ^ (value >>> 16)) >>> 0) / 0x1_0000_0000;
}

function rgba(hex, alpha) {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgba(${value >> 16},${(value >> 8) & 255},${value & 255},${Math.max(0, Math.min(1, alpha))})`;
}

export function getWallNeighborhood(map, x, y) {
  let mask = 0;
  for (let direction = 0; direction < CARDINAL.length; direction += 1) {
    const [dx, dy] = CARDINAL[direction];
    const nx = x + dx;
    const ny = y + dy;
    if (nx >= 0 && ny >= 0 && nx < map.width && ny < map.height && map.tiles[ny * map.width + nx] === TILE.WALL) mask |= CARDINAL_BITS[direction];
  }
  return mask;
}

export function classifyWallShape(mask) {
  const north = (mask & 1) !== 0;
  const east = (mask & 2) !== 0;
  const south = (mask & 4) !== 0;
  const west = (mask & 8) !== 0;
  const count = Number(north) + Number(east) + Number(south) + Number(west);
  if (count === 0) return "isolated";
  if (count === 1) return "end";
  if (count === 2) return north === south || east === west ? "straight" : "corner";
  if (count === 3) return "tee";
  return "cross";
}

function biomeAt(map, index) {
  return BIOMES[map.biomeByTile?.[index] ?? map.biomeId] ?? BIOMES.stone;
}

function fillFloorMarks(context, map, x, y, size, biome, corridor = false) {
  const hash = cellHash(map, x, y, corridor ? 3 : 1);
  const palette = biome.palette;
  context.fillStyle = hash > 0.48 ? (corridor ? palette.corridor : palette.floor) : (corridor ? palette.floor : palette.floorAlt);
  context.fillRect(0, 0, size, size);
  if (size < 5) return;
  const pattern = corridor ? biome.tiles.corridorPattern : biome.tiles.floorPattern;
  const variation = biome.tiles.variation;
  context.globalAlpha = Math.min(0.38, variation * (0.45 + cellHash(map, x, y, 9)));
  context.fillStyle = palette.floorMark;
  if (pattern === "segmented-plate" || pattern === "conduit-joint" || pattern === "worn-joint" || pattern === "burial-seam" || pattern === "votive-seam") {
    const seam = Math.max(1, Math.floor(size / 14));
    context.fillRect(seam, seam, size - seam * 2, seam);
    context.fillRect(seam, size - seam * 2, size - seam * 2, seam);
    if (pattern === "segmented-plate" && size >= 12) {
      const inset = size * (0.18 + cellHash(map, x, y, 12) * 0.22);
      const radius = Math.max(0.65, size * 0.045);
      for (const [rx, ry] of [[inset, inset], [size - inset, inset], [inset, size - inset], [size - inset, size - inset]]) {
        context.fillStyle = palette.wallEdge;
        context.beginPath(); context.arc(rx, ry, radius, 0, Math.PI * 2); context.fill();
      }
    }
  } else if (pattern === "basalt-crackle" || pattern === "cinder-run") {
    context.strokeStyle = palette.seam;
    context.lineWidth = Math.max(1, size * 0.055);
    context.beginPath();
    const left = size * (0.12 + cellHash(map, x, y, 13) * 0.25);
    context.moveTo(left, 0); context.lineTo(left + size * 0.12, size * 0.34);
    context.lineTo(left - size * 0.08, size * 0.58); context.lineTo(left + size * 0.12, size);
    context.stroke();
    context.globalAlpha *= 0.55;
    context.strokeStyle = palette.light;
    context.beginPath(); context.moveTo(left + 1, size * 0.18); context.lineTo(left + size * 0.11, size * 0.35); context.stroke();
  } else if (pattern === "ash-mosaic") {
    const inset = Math.max(1, Math.floor(size * 0.15));
    context.strokeStyle = palette.seam; context.lineWidth = Math.max(1, size * 0.04);
    context.strokeRect(inset, inset, size - inset * 2, size - inset * 2);
    if (cellHash(map, x, y, 16) > 0.55) context.fillRect(size * 0.4, size * 0.4, Math.max(1, size * 0.2), Math.max(1, size * 0.2));
  } else {
    const count = pattern === "crypt-dust" ? 3 : 2;
    for (let mark = 0; mark < count; mark += 1) {
      const mx = Math.floor(cellHash(map, x, y, 20 + mark) * Math.max(1, size - 2));
      const my = Math.floor(cellHash(map, x, y, 30 + mark) * Math.max(1, size - 2));
      const dot = Math.max(1, Math.floor(size * (0.05 + cellHash(map, x, y, 40 + mark) * 0.06)));
      context.fillRect(mx, my, dot, dot);
    }
  }
  context.globalAlpha = 1;
  if (!corridor && pattern === "crypt-dust" && hash > 0.75 && size >= 9) {
    context.fillStyle = rgba(palette.light, 0.12);
    context.beginPath(); context.ellipse(size * 0.68, size * 0.35, size * 0.22, size * 0.09, -0.3, 0, Math.PI * 2); context.fill();
  }
}

function drawWall(context, map, x, y, size, biome) {
  const palette = biome.palette;
  const mask = getWallNeighborhood(map, x, y);
  const shape = classifyWallShape(mask);
  const faceHeight = Math.max(2, Math.round(size * biome.tiles.faceRatio));
  const capHeight = Math.max(1, size - faceHeight);
  context.fillStyle = palette.wallTop;
  context.fillRect(0, 0, size, size);
  context.fillStyle = palette.wallFace;
  context.fillRect(0, capHeight, size, faceHeight);
  if (size >= 5) {
    const edge = Math.max(1, Math.floor(size * 0.07));
    context.fillStyle = palette.wallEdge;
    if (!(mask & 1)) context.fillRect(0, 0, size, edge);
    if (!(mask & 8)) context.fillRect(0, 0, edge, size);
    if (!(mask & 2)) context.fillRect(size - edge, 0, edge, size);
    context.fillStyle = palette.deep;
    context.fillRect(0, size - edge, size, edge);
    context.fillStyle = rgba(palette.seam, 0.7);
    context.fillRect(0, capHeight, size, Math.max(1, Math.floor(size * 0.045)));
    const seamY = capHeight + Math.floor(faceHeight * 0.52);
    context.fillRect(0, seamY, size, Math.max(1, Math.floor(size * 0.04)));
    const split = Math.floor(size * (0.38 + cellHash(map, x, y, 51) * 0.24));
    context.fillRect(split, capHeight, Math.max(1, size * 0.04), Math.max(1, faceHeight * 0.52));
    context.fillRect(Math.floor(size * (0.18 + cellHash(map, x, y, 52) * 0.22)), seamY, Math.max(1, size * 0.04), faceHeight - (seamY - capHeight));
    if (shape === "corner" || shape === "end") {
      context.fillStyle = rgba(palette.wallEdge, 0.28);
      context.fillRect(edge, capHeight + edge, size - edge * 2, Math.max(1, edge * 0.6));
    }
    if (shape === "tee" || shape === "cross") {
      context.fillStyle = rgba(palette.deep, 0.35);
      context.fillRect(size * 0.45, 0, Math.max(1, size * 0.08), capHeight);
    }
  }
}

function drawFloorCell(context, map, x, y, tile, size) {
  const biome = biomeAt(map, y * map.width + x);
  if (tile === TILE.WALL) drawWall(context, map, x, y, size, biome);
  else fillFloorMarks(context, map, x, y, size, biome, tile === TILE.CORRIDOR);
  if (tile === TILE.STAIRS_DOWN || tile === TILE.STAIRS_UP) {
    context.fillStyle = rgba(biome.palette.accent, 0.35); context.fillRect(size * 0.22, size * 0.2, size * 0.56, size * 0.62);
    context.fillStyle = biome.palette.light;
    for (let step = 0; step < 3; step += 1) context.fillRect(size * 0.3, size * (0.34 + step * 0.13), size * (0.4 - step * 0.06), Math.max(1, size * 0.04));
  } else if (tile === TILE.BOSS) {
    context.strokeStyle = biome.palette.accent; context.lineWidth = Math.max(1, size * 0.06);
    context.strokeRect(size * 0.22, size * 0.22, size * 0.56, size * 0.56);
  }
}

function drawProp(context, shape, color, size, x, y, variant = 0) {
  const center = size / 2;
  context.save();
  context.translate(x + center, y + center);
  const unit = Math.max(1, size / 16);
  context.fillStyle = "#111517";
  context.globalAlpha = 0.55;
  context.fillRect(-size * 0.28, size * 0.2, size * 0.56, Math.max(1, size * 0.09));
  context.globalAlpha = 1;
  context.fillStyle = color;
  context.strokeStyle = "#111719";
  context.lineWidth = Math.max(1, size * 0.045);
  switch (shape) {
    case "sconce":
    case "candle":
    case "flame-bowl": {
      context.fillRect(-size * 0.19, size * 0.04, size * 0.38, size * 0.17);
      context.fillStyle = shape === "flame-bowl" ? "#55d8c5" : "#ffcf76";
      context.beginPath(); context.moveTo(0, -size * 0.32); context.lineTo(size * 0.13, -size * 0.06); context.lineTo(size * 0.06, size * 0.04); context.lineTo(-size * 0.08, size * 0.03); context.lineTo(-size * 0.12, -size * 0.08); context.closePath(); context.fill();
      context.fillStyle = "#fff0b8"; context.fillRect(-unit * 0.45, -size * 0.13, unit * 0.9, size * 0.13);
      if (shape === "candle") { context.fillStyle = color; context.fillRect(-size * 0.1, -size * 0.03, size * 0.2, size * 0.26); }
      if (shape === "flame-bowl") { context.fillStyle = "#576d68"; context.fillRect(-size * 0.26, size * 0.04, size * 0.52, size * 0.17); }
      break;
    }
    case "grille":
      context.fillStyle = "#252e30"; context.fillRect(-size * 0.36, -size * 0.3, size * 0.72, size * 0.62);
      context.fillStyle = color;
      for (let bar = -2; bar <= 2; bar += 1) context.fillRect(bar * size * 0.12 - unit / 2, -size * 0.27, unit, size * 0.55);
      context.fillRect(-size * 0.36, -size * 0.12, size * 0.72, unit); context.fillRect(-size * 0.36, size * 0.12, size * 0.72, unit);
      break;
    case "rubble":
      for (let rock = 0; rock < 3; rock += 1) {
        context.fillStyle = rock === 1 ? color : (variant % 2 ? "#525b5c" : "#697274");
        context.beginPath(); context.moveTo((-0.3 + rock * 0.18) * size, size * 0.14); context.lineTo((-0.21 + rock * 0.18) * size, -size * (0.12 + rock % 2 * 0.08)); context.lineTo((-0.04 + rock * 0.18) * size, size * 0.08); context.closePath(); context.fill();
      }
      break;
    case "coffer":
      context.fillStyle = "#483126"; context.fillRect(-size * 0.3, -size * 0.12, size * 0.6, size * 0.34);
      context.fillStyle = color; context.fillRect(-size * 0.3, -size * 0.17, size * 0.6, size * 0.11);
      context.fillStyle = "#d5bd7c"; context.fillRect(-unit * 0.5, -size * 0.02, unit, size * 0.14);
      context.strokeRect(-size * 0.3, -size * 0.12, size * 0.6, size * 0.34);
      break;
    case "sarcophagus":
      context.fillStyle = "#5c5b55"; context.fillRect(-size * 0.3, -size * 0.31, size * 0.6, size * 0.62);
      context.fillStyle = color; context.fillRect(-size * 0.24, -size * 0.27, size * 0.48, size * 0.54);
      context.fillStyle = "#605e56"; context.fillRect(-size * 0.14, -size * 0.21, size * 0.28, size * 0.42);
      context.fillStyle = "#d9d0b6"; context.fillRect(-unit * 0.45, -size * 0.2, unit * 0.9, size * 0.34);
      break;
    case "bones":
      context.strokeStyle = color; context.lineWidth = Math.max(1, size * 0.09); context.beginPath(); context.moveTo(-size * 0.25, -size * 0.12); context.lineTo(size * 0.22, size * 0.12); context.moveTo(-size * 0.15, size * 0.17); context.lineTo(size * 0.18, -size * 0.16); context.stroke();
      context.fillStyle = "#d7cfb7"; for (const [bx, by] of [[-0.25, -0.12], [0.22, 0.12], [-0.15, 0.17], [0.18, -0.16]]) { context.beginPath(); context.arc(bx * size, by * size, unit * 1.2, 0, Math.PI * 2); context.fill(); }
      break;
    case "water":
      context.fillStyle = "#17434b"; context.fillRect(-size * 0.34, -size * 0.14, size * 0.68, size * 0.28);
      context.fillStyle = color; for (let line = 0; line < 3; line += 1) context.fillRect(-size * 0.27 + line * size * 0.07, -size * 0.1 + (line % 2) * size * 0.1, size * 0.28, Math.max(1, unit * 0.65));
      break;
    case "core":
      context.fillStyle = "#28343a"; context.fillRect(-size * 0.31, -size * 0.23, size * 0.62, size * 0.46);
      context.fillStyle = color; context.beginPath(); context.arc(0, 0, size * (0.15 + variant % 2 * 0.025), 0, Math.PI * 2); context.fill();
      context.strokeStyle = "#86e6dc"; context.strokeRect(-size * 0.37, -size * 0.28, size * 0.74, size * 0.56);
      break;
    case "terminal":
      context.fillStyle = "#222d34"; context.fillRect(-size * 0.3, -size * 0.31, size * 0.6, size * 0.62);
      context.fillStyle = color; context.fillRect(-size * 0.2, -size * 0.22, size * 0.4, size * 0.22);
      context.fillStyle = "#d3b27b"; context.fillRect(-size * 0.18, size * 0.09, size * 0.1, unit); context.fillRect(size * 0.05, size * 0.09, size * 0.13, unit);
      break;
    case "conduit":
      context.strokeStyle = color; context.lineWidth = Math.max(1, size * 0.1); context.beginPath(); context.moveTo(-size * 0.42, -size * 0.13); context.lineTo(size * 0.15, -size * 0.13); context.lineTo(size * 0.15, size * 0.17); context.lineTo(size * 0.4, size * 0.17); context.stroke();
      break;
    case "pillar":
      context.fillStyle = "#252d30"; context.fillRect(-size * 0.25, -size * 0.3, size * 0.5, size * 0.58);
      context.fillStyle = color; context.fillRect(-size * 0.2, -size * 0.25, size * 0.4, size * 0.48);
      context.fillRect(-size * 0.3, -size * 0.29, size * 0.6, size * 0.11); context.fillRect(-size * 0.3, size * 0.17, size * 0.6, size * 0.11);
      break;
    case "lava":
      context.fillStyle = "#241715"; context.beginPath(); context.moveTo(-size * 0.36, -size * 0.04); context.lineTo(-size * 0.11, -size * 0.17); context.lineTo(size * 0.03, size * 0.01); context.lineTo(size * 0.34, -size * 0.1); context.lineTo(size * 0.16, size * 0.22); context.lineTo(-size * 0.19, size * 0.17); context.closePath(); context.fill();
      context.strokeStyle = color; context.lineWidth = Math.max(1, size * 0.1); context.beginPath(); context.moveTo(-size * 0.28, 0); context.lineTo(-size * 0.08, -size * 0.09); context.lineTo(size * 0.06, size * 0.08); context.lineTo(size * 0.26, -size * 0.02); context.stroke();
      break;
    case "vent":
      context.fillStyle = "#302c2d"; context.fillRect(-size * 0.3, -size * 0.14, size * 0.6, size * 0.3);
      context.fillStyle = color; context.fillRect(-size * 0.21, -unit, size * 0.42, Math.max(1, unit));
      context.fillStyle = "#f6a35b"; context.fillRect(-size * 0.1, -size * 0.09, size * 0.2, unit);
      break;
    case "shelf":
      context.fillStyle = "#332c2a"; context.fillRect(-size * 0.34, -size * 0.29, size * 0.68, size * 0.58);
      context.fillStyle = color; for (let row = 0; row < 3; row += 1) { context.fillRect(-size * 0.31, -size * 0.18 + row * size * 0.2, size * 0.62, unit); for (let book = 0; book < 4; book += 1) context.fillRect(-size * 0.25 + book * size * 0.15, -size * 0.27 + row * size * 0.2, size * 0.07, size * 0.09); }
      break;
    case "glass":
      context.fillStyle = "#604a67"; context.beginPath(); context.moveTo(-size * 0.28, size * 0.22); context.lineTo(-size * 0.12, -size * 0.28); context.lineTo(size * 0.03, size * 0.05); context.closePath(); context.fill();
      context.fillStyle = color; context.beginPath(); context.moveTo(-size * 0.04, size * 0.25); context.lineTo(size * 0.11, -size * 0.15); context.lineTo(size * 0.28, size * 0.18); context.closePath(); context.fill();
      break;
    case "spikes":
      for (let spike = -1; spike <= 1; spike += 1) { context.beginPath(); context.moveTo(spike * size * 0.2 - size * 0.09, size * 0.2); context.lineTo(spike * size * 0.2, -size * 0.23); context.lineTo(spike * size * 0.2 + size * 0.09, size * 0.2); context.closePath(); context.fill(); }
      break;
    case "arcs":
      context.strokeStyle = color; context.lineWidth = Math.max(1, size * 0.06); context.beginPath(); context.moveTo(-size * 0.32, 0); context.lineTo(-size * 0.1, -size * 0.17); context.lineTo(size * 0.04, size * 0.15); context.lineTo(size * 0.3, -size * 0.06); context.stroke();
      break;
    default:
      context.fillRect(-size * 0.18, -size * 0.18, size * 0.36, size * 0.36);
  }
  context.restore();
}

function drawStaticLayer(context, map, tileSize) {
  context.fillStyle = BIOMES[map.biomeId]?.palette.deep ?? "#0a0d11";
  context.fillRect(0, 0, map.width * tileSize, map.height * tileSize);
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      context.save(); context.translate(x * tileSize, y * tileSize);
      drawFloorCell(context, map, x, y, map.tiles[y * map.width + x], tileSize);
      context.restore();
    }
  }
  for (const prop of map.decorations ?? []) drawProp(context, prop.shape, prop.color, tileSize, prop.x * tileSize, prop.y * tileSize, prop.x + prop.y);
  for (const hazard of map.hazards ?? []) drawProp(context, hazard.shape, hazard.color, tileSize, hazard.x * tileSize, hazard.y * tileSize, hazard.x + hazard.y);
}

function makeCanvas(width, height) {
  if (typeof globalThis.OffscreenCanvas === "function") return new globalThis.OffscreenCanvas(width, height);
  if (typeof document !== "undefined" && typeof document.createElement === "function") {
    const canvas = document.createElement("canvas"); canvas.width = width; canvas.height = height; return canvas;
  }
  return null;
}

function staticLayer(map, tileSize) {
  let layers = layerCache.get(map);
  if (!layers) { layers = new Map(); layerCache.set(map, layers); }
  if (layers.has(tileSize)) return layers.get(tileSize);
  const canvas = makeCanvas(map.width * tileSize, map.height * tileSize);
  if (!canvas) return null;
  const context = canvas.getContext("2d", { alpha: false });
  if (!context) return null;
  context.imageSmoothingEnabled = false;
  drawStaticLayer(context, map, tileSize);
  layers.set(tileSize, canvas);
  if (layers.size > 3) layers.delete(layers.keys().next().value);
  return canvas;
}

export function drawBiomeStatic(context, map, layout) {
  const canvas = staticLayer(map, layout.tileSize);
  if (canvas) {
    context.save(); context.imageSmoothingEnabled = false;
    context.drawImage(canvas, layout.offsetX, layout.offsetY);
    context.restore();
    return true;
  }
  context.save(); context.translate(layout.offsetX, layout.offsetY); drawStaticLayer(context, map, layout.tileSize); context.restore();
  return false;
}

function visibleAt(state, x, y) {
  return x >= 0 && y >= 0 && x < state.map.width && y < state.map.height && state.visible?.[y * state.map.width + x] === 1;
}

function addLight(context, light, layout, flicker, biome) {
  const x = layout.offsetX + (light.x + 0.5) * layout.tileSize;
  const y = layout.offsetY + (light.y + 0.5) * layout.tileSize;
  const radius = light.radius * layout.tileSize;
  const alpha = Math.max(0.025, Math.min(0.3, light.intensity * 0.22 * flicker * biome.lighting.intensity));
  const gradient = context.createRadialGradient(x, y, 0, x, y, radius);
  gradient.addColorStop(0, rgba(light.color, alpha));
  gradient.addColorStop(0.48, rgba(light.color, alpha * 0.42));
  gradient.addColorStop(1, rgba(light.color, 0));
  context.fillStyle = gradient;
  context.fillRect(x - radius, y - radius, radius * 2, radius * 2);
}

function drawAnimatedDecoration(context, prop, layout, time) {
  const size = layout.tileSize;
  const x = layout.offsetX + prop.x * size;
  const y = layout.offsetY + prop.y * size;
  const phase = time * (prop.animation === "water" ? 0.0014 : 0.0018) + prop.x * 1.7 + prop.y * 2.3;
  if (prop.animation === "water") {
    context.fillStyle = rgba(prop.color, 0.18 + (Math.sin(phase) + 1) * 0.07);
    const offset = (Math.sin(phase) + 1) * size * 0.12;
    context.fillRect(x + size * 0.2 + offset, y + size * 0.31, Math.max(1, size * 0.32), Math.max(1, size * 0.05));
    context.fillRect(x + size * 0.42 - offset, y + size * 0.62, Math.max(1, size * 0.2), Math.max(1, size * 0.04));
  } else if (prop.animation === "lava") {
    context.fillStyle = rgba(prop.lightColor ?? prop.color, 0.16 + (Math.sin(phase) + 1) * 0.08);
    context.fillRect(x + size * (0.22 + (Math.sin(phase) + 1) * 0.1), y + size * 0.49, Math.max(1, size * 0.3), Math.max(1, size * 0.07));
  } else if (prop.animation === "energy") {
    context.strokeStyle = rgba(prop.lightColor ?? prop.color, 0.15 + (Math.sin(phase) + 1) * 0.12);
    context.lineWidth = Math.max(1, size * 0.04);
    context.strokeRect(x + size * 0.27, y + size * 0.27, size * 0.46, size * 0.46);
  }
}

/** Draw animated materials and bounded light only through the current FOV. */
export function drawBiomeOverlay(context, state, layout, timestamp = 0, reducedEffects = false) {
  if (!state?.map || !layout) return;
  const { map } = state;
  const tile = layout.tileSize;
  const time = reducedEffects ? 0 : Number(timestamp) || 0;
  context.save();
  context.beginPath();
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      if (!visibleAt(state, x, y)) continue;
      context.rect(layout.offsetX + x * tile, layout.offsetY + y * tile, tile, tile);
    }
  }
  context.clip();
  if (!reducedEffects) {
    for (const prop of map.decorations ?? []) {
      if (!visibleAt(state, prop.x, prop.y)) continue;
      if (prop.animation === "water" || prop.animation === "lava" || prop.animation === "energy") drawAnimatedDecoration(context, prop, layout, time);
    }
    context.globalCompositeOperation = "lighter";
    for (const light of map.lights ?? []) {
      if (!visibleAt(state, light.x, light.y)) continue;
      const biome = BIOMES[light.biomeId] ?? biomeAt(map, light.y * map.width + light.x);
      const flicker = 1 + Math.sin(time * 0.006 + light.x * 1.71 + light.y * 2.37) * biome.lighting.flicker;
      addLight(context, light, layout, flicker, biome);
    }
    context.globalCompositeOperation = "source-over";
    context.globalAlpha = 1;
  }
  context.restore();
  const biome = BIOMES[map.biomeId] ?? BIOMES.stone;
  const width = map.width * tile;
  const height = map.height * tile;
  const centerX = layout.offsetX + width / 2;
  const centerY = layout.offsetY + height / 2;
  const radius = Math.max(width, height) * 0.73;
  const vignette = context.createRadialGradient(centerX, centerY, radius * 0.22, centerX, centerY, radius);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(0.72, rgba(biome.palette.deep, biome.lighting.vignette * 0.22));
  vignette.addColorStop(1, rgba(biome.palette.deep, biome.lighting.vignette * (reducedEffects ? 0.42 : 0.58)));
  context.save(); context.fillStyle = vignette; context.fillRect(layout.offsetX, layout.offsetY, width, height); context.restore();
}

export function clearBiomeRenderCache(map) {
  if (map) layerCache.delete(map);
}
