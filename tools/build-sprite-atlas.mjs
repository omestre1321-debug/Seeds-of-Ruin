import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import zlib from "node:zlib";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE_ROOT = path.join(ROOT, "assets", "sprites", "source");
const OUTPUT_ROOT = path.join(ROOT, "assets", "sprites");
const ATLAS_PATH = path.join(ROOT, "assets", "atlas.json");
const OVERRIDES_PATH = path.join(ROOT, "assets", "atlas-overrides.json");
const GRID = 16;
const SUPPORTED_CATEGORIES = Object.freeze([
  "weapon_sword","weapon_axe","weapon_mace","weapon_staff","weapon_bow","shield","helmet","chest_armor","boots","gloves","ring","amulet","potion","food","gem","key","book","herb",
  "monster_rat","monster_wolf","monster_goblin","monster_orc","monster_spider","monster_bat","monster_elemental","monster_skeleton","monster_mummy","monster_bandit","monster_ghost","monster_slime","monster_reptile","player_body",
  "effect_slash","effect_blood","effect_fire","effect_water","effect_magic","effect_heal","effect_emote","effect_status","effect_spark",
]);

export const SHEET_SPECS = Object.freeze([
  { id: "items", file: "items.png", source: "armas e armaduras 2.png", scale: 3, offsetX: 2, offsetY: 0, detector: "grid", columns: 13 },
  { id: "items-small", file: "items-small.png", source: "armas e armaduras.png", scale: 1, offsetX: 0, offsetY: 0, detector: "grid", columns: 14 },
  { id: "effects", file: "effects.png", source: "efeitos.png", scale: 1, offsetX: 0, offsetY: 0, detector: "components" },
  { id: "characters", file: "characters.png", source: "monstros.png", scale: 3, offsetX: 0, offsetY: 2, detector: "characters", columns: 8 },
]);

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const name = Buffer.from(type, "ascii");
  const chunk = Buffer.alloc(12 + data.length);
  chunk.writeUInt32BE(data.length, 0); name.copy(chunk, 4); data.copy(chunk, 8);
  chunk.writeUInt32BE(crc32(Buffer.concat([name, data])), 8 + data.length);
  return chunk;
}

export function encodePng(width, height, rgba) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || rgba.length !== width * height * 4) throw new RangeError("Invalid RGBA image dimensions");
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0); header.writeUInt32BE(height, 4);
  header[8] = 8; header[9] = 6; header[10] = 0; header[11] = 0; header[12] = 0;
  const raw = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y += 1) rgba.copy(raw, y * (width * 4 + 1) + 1, y * width * 4, (y + 1) * width * 4);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", header), pngChunk("IDAT", zlib.deflateSync(raw, { level: 9 })), pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

export function decodePng(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.readUInt32BE(0) !== 0x89504e47) throw new TypeError("Not a PNG file");
  let offset = 8; let width = 0; let height = 0; let bitDepth = 0; let colorType = 0; let interlace = 0; const data = [];
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset); const type = buffer.toString("ascii", offset + 4, offset + 8);
    const chunk = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === "IHDR") { width = chunk.readUInt32BE(0); height = chunk.readUInt32BE(4); bitDepth = chunk[8]; colorType = chunk[9]; interlace = chunk[12]; }
    else if (type === "IDAT") data.push(chunk);
    offset += length + 12;
    if (type === "IEND") break;
  }
  if (bitDepth !== 8 || ![2, 6].includes(colorType) || interlace !== 0) throw new Error(`Unsupported PNG format: bit depth ${bitDepth}, color type ${colorType}, interlace ${interlace}`);
  const sourceChannels = colorType === 6 ? 4 : 3;
  const stride = width * sourceChannels;
  const inflated = zlib.inflateSync(Buffer.concat(data));
  const decoded = Buffer.alloc(height * stride);
  let sourceOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset++]; const row = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const value = inflated[sourceOffset++];
      const left = x >= sourceChannels ? decoded[row + x - sourceChannels] : 0;
      const above = y > 0 ? decoded[row - stride + x] : 0;
      const upperLeft = y > 0 && x >= sourceChannels ? decoded[row - stride + x - sourceChannels] : 0;
      let predictor = 0;
      if (filter === 1) predictor = left;
      else if (filter === 2) predictor = above;
      else if (filter === 3) predictor = Math.floor((left + above) / 2);
      else if (filter === 4) {
        const p = left + above - upperLeft;
        const pa = Math.abs(p - left); const pb = Math.abs(p - above); const pc = Math.abs(p - upperLeft);
        predictor = pa <= pb && pa <= pc ? left : pb <= pc ? above : upperLeft;
      } else if (filter !== 0) throw new Error(`Unsupported PNG filter ${filter}`);
      decoded[row + x] = (value + predictor) & 255;
    }
  }
  const pixels = Buffer.alloc(width * height * 4);
  for (let index = 0; index < width * height; index += 1) {
    pixels[index * 4] = decoded[index * sourceChannels];
    pixels[index * 4 + 1] = decoded[index * sourceChannels + 1];
    pixels[index * 4 + 2] = decoded[index * sourceChannels + 2];
    pixels[index * 4 + 3] = sourceChannels === 4 ? decoded[index * sourceChannels + 3] : 255;
  }
  return { width, height, pixels };
}

function colorKey(pixels, index) { return `${pixels[index]},${pixels[index + 1]},${pixels[index + 2]}`; }

export function removeConnectedMatte(image) {
  const { width, height, pixels } = image;
  if (pixels.some((_, index) => index % 4 === 3 && pixels[index] < 255)) return { ...image, matte: "existing-alpha", removed: 0 };
  const edgeCounts = new Map();
  const countEdge = (x, y) => { const key = colorKey(pixels, (y * width + x) * 4); edgeCounts.set(key, (edgeCounts.get(key) ?? 0) + 1); };
  for (let x = 0; x < width; x += 1) { countEdge(x, 0); if (height > 1) countEdge(x, height - 1); }
  for (let y = 1; y < height - 1; y += 1) { countEdge(0, y); if (width > 1) countEdge(width - 1, y); }
  const edgePixels = Math.max(1, 2 * width + 2 * height - 4);
  const matteColors = new Set([...edgeCounts].filter(([key, count]) => {
    const [r, g, b] = key.split(",").map(Number);
    const nearNeutral = Math.max(r, g, b) - Math.min(r, g, b) <= 16;
    return count >= edgePixels * 0.12 || (nearNeutral && Math.min(r, g, b) >= 220 && count >= 4);
  }).map(([key]) => key));
  if (matteColors.size === 0) return { ...image, matte: "none-detected", removed: 0 };
  const seen = new Uint8Array(width * height); const queue = new Int32Array(width * height); let head = 0; let tail = 0;
  const enqueue = (x, y) => {
    const index = y * width + x;
    if (seen[index]) return;
    const pixel = index * 4;
    if (!matteColors.has(colorKey(pixels, pixel))) return;
    seen[index] = 1; queue[tail++] = index;
  };
  for (let x = 0; x < width; x += 1) { enqueue(x, 0); enqueue(x, height - 1); }
  for (let y = 1; y < height - 1; y += 1) { enqueue(0, y); enqueue(width - 1, y); }
  while (head < tail) {
    const index = queue[head++]; const x = index % width; const y = Math.floor(index / width);
    for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx; const ny = y + dy;
      if (nx >= 0 && ny >= 0 && nx < width && ny < height) enqueue(nx, ny);
    }
  }
  for (let index = 0; index < seen.length; index += 1) if (seen[index]) pixels[index * 4 + 3] = 0;
  return { ...image, matte: [...matteColors], removed: tail };
}

export function nearestNormalize(image, scale, offsetX = 0, offsetY = 0) {
  const width = Math.floor((image.width - offsetX) / scale);
  const height = Math.floor((image.height - offsetY) / scale);
  const pixels = Buffer.alloc(width * height * 4);
  const sampleOffset = Math.floor(scale / 2);
  for (let y = 0; y < height; y += 1) for (let x = 0; x < width; x += 1) {
    const sourceIndex = ((offsetY + y * scale + sampleOffset) * image.width + offsetX + x * scale + sampleOffset) * 4;
    const targetIndex = (y * width + x) * 4;
    image.pixels.copy(pixels, targetIndex, sourceIndex, sourceIndex + 4);
  }
  return { width, height, pixels };
}

function alphaAt(image, x, y) { return image.pixels[(y * image.width + x) * 4 + 3] > 0; }

function cellHasPixels(image, x, y, width, height) {
  let count = 0;
  for (let py = y; py < Math.min(image.height, y + height); py += 1) for (let px = x; px < Math.min(image.width, x + width); px += 1) if (alphaAt(image, px, py)) count += 1;
  return count;
}

function categoryForItemCell(sheetId, row, column) {
  if (sheetId === "items-small") {
    if (row <= 1) return column < 5 ? "boots" : "helmet";
    if (row === 2) return column < 6 ? "weapon_axe" : "weapon_sword";
    if (row >= 3 && row <= 5) return column < 10 ? "food" : "potion";
    if (row >= 6 && row <= 8) return column < 5 ? "herb" : column < 10 ? "gem" : "potion";
    if (row === 9) return column < 7 ? "key" : "gem";
    if (row <= 11) return column < 6 ? "weapon_axe" : "weapon_bow";
    return column < 7 ? "weapon_sword" : "shield";
  }
  if (row <= 2) return column < 7 ? "ring" : "amulet";
  if (row === 3) return column < 6 ? "gem" : column < 10 ? "amulet" : "key";
  if (row <= 5) return column < 5 ? "food" : column < 9 ? "gem" : "potion";
  if (row === 6) return column < 4 ? "gem" : column < 8 ? "weapon_axe" : "weapon_mace";
  if (row <= 8) return column < 5 ? "weapon_sword" : column < 9 ? "weapon_axe" : "weapon_mace";
  if (row === 9) return "helmet";
  if (row === 10) return column < 6 ? "chest_armor" : column < 9 ? "boots" : "gloves";
  if (row === 11) return column < 5 ? "chest_armor" : column < 9 ? "boots" : "shield";
  if (row === 12) return column < 5 ? "weapon_staff" : column < 9 ? "shield" : "book";
  return column < 7 ? "herb" : "book";
}

function categoryForCharacter(row, column) {
  if (row <= 1 && column < 7) return "player_body";
  if (row <= 1) return "monster_beast";
  if (row <= 3) return row === 2 ? "monster_goblin" : "monster_bandit";
  if (row === 4) return column < 4 ? "monster_spider" : "monster_bat";
  if (row === 5) return "monster_elemental";
  if (row === 6) return column < 4 ? "monster_skeleton" : "monster_mummy";
  if (row === 7) return column < 4 ? "monster_ghost" : "monster_reptile";
  return "monster_slime";
}

function effectColorCategory(image, component) {
  const { pixels, width, height } = image;
  const { x, y, width: boxWidth, height: boxHeight } = component;
  const counts = { red: 0, green: 0, blue: 0, warm: 0, purple: 0, total: 0 };
  for (let py = y; py < Math.min(height, y + boxHeight); py += 1) for (let px = x; px < Math.min(width, x + boxWidth); px += 1) {
    const index = (py * width + px) * 4;
    if (pixels[index + 3] === 0) continue;
    const r = pixels[index]; const g = pixels[index + 1]; const b = pixels[index + 2];
    counts.total += 1;
    if (r > 145 && r > g * 1.28 && r > b * 1.22) counts.red += 1;
    if (g > 135 && g > r * 1.2 && g > b * 0.85) counts.green += 1;
    if (b > 140 && b > r * 1.12 && b > g * 0.94) counts.blue += 1;
    if (r > 180 && g > 85 && r > b * 1.2) counts.warm += 1;
    if (r > 95 && b > 110 && b > g * 1.12) counts.purple += 1;
  }
  if (counts.total && counts.red / counts.total > 0.2) return "effect_blood";
  if (counts.total && counts.green / counts.total > 0.22) return "effect_heal";
  if (counts.total && counts.warm / counts.total > 0.3) return "effect_fire";
  if (counts.total && counts.blue / counts.total > 0.25) return "effect_water";
  if (counts.total && counts.purple / counts.total > 0.22) return "effect_magic";
  if (y > 105 && x > 430) return "effect_emote";
  if (boxWidth > boxHeight * 1.8 || boxHeight > boxWidth * 1.8) return "effect_slash";
  if (y < 75) return "effect_spark";
  return "effect_status";
}

function detectGrid(image, spec) {
  const sprites = [];
  const components = connectedComponents(image).filter((component) => component.area >= 2);
  const rows = Math.ceil(image.height / GRID);
  for (let row = 0; row < rows; row += 1) for (let column = 0; column < spec.columns; column += 1) {
    const x = column * GRID; const y = row * GRID;
    const width = Math.min(GRID, image.width - x); const height = Math.min(GRID, image.height - y);
    if (width <= 0 || height <= 0 || cellHasPixels(image, x, y, width, height) < 3) continue;
    const cutsComponent = components.some((component) => component.x < x + width && component.x + component.width > x && component.y < y + height && component.y + component.height > y
      && (component.x < x || component.x + component.width > x + width || component.y < y || component.y + component.height > y + height));
    sprites.push({
      id: `${spec.id}-r${String(row).padStart(2, "0")}-c${String(column).padStart(2, "0")}`,
      sheet: spec.id, x, y, width, height, category: categoryForItemCell(spec.id, row, column), row, column,
      detection: "16x16-grid", needsReview: cutsComponent,
    });
  }
  return sprites;
}

function detectItems(image, spec) {
  const raw = connectedComponents(image).filter((component) => component.area >= 3);
  const sprites = []; const occupied = new Set(); const large = [];
  const cellId = (row, column) => `${spec.id}-r${String(row).padStart(2, "0")}-c${String(column).padStart(2, "0")}`;
  for (const component of raw) {
    if (component.width <= GRID && component.height <= GRID) {
      const row = Math.floor(component.y / GRID); const column = Math.floor(component.x / GRID);
      sprites.push({ ...component, id: `${cellId(row, column)}-p${String(sprites.length + 1).padStart(3, "0")}`, sheet: spec.id, category: categoryForItemCell(spec.id, row, column), row, column, detection: "connected-component", needsReview: false });
    } else large.push(component);
  }
  for (const component of large) {
    const c0 = Math.floor(component.x / GRID); const c1 = Math.floor((component.x + component.width - 1) / GRID);
    const r0 = Math.floor(component.y / GRID); const r1 = Math.floor((component.y + component.height - 1) / GRID);
    for (let row = r0; row <= r1; row += 1) for (let column = c0; column <= c1; column += 1) {
      const x = column * GRID; const y = row * GRID;
      const width = Math.min(GRID, image.width - x); const height = Math.min(GRID, image.height - y);
      const key = `${row}:${column}`;
      if (width <= 0 || height <= 0 || occupied.has(key) || cellHasPixels(image, x, y, width, height) < 3) continue;
      occupied.add(key);
      sprites.push({ id: cellId(row, column), sheet: spec.id, x, y, width, height, category: categoryForItemCell(spec.id, row, column), row, column, detection: "component-grid-split", needsReview: true });
    }
  }
  return sprites.filter((sprite) => {
    if (sprite.detection === "component-grid-split") return true;
    const minColumn = Math.floor(sprite.x / GRID); const maxColumn = Math.floor((sprite.x + sprite.width - 1) / GRID);
    const minRow = Math.floor(sprite.y / GRID); const maxRow = Math.floor((sprite.y + sprite.height - 1) / GRID);
    for (let row = minRow; row <= maxRow; row += 1) for (let column = minColumn; column <= maxColumn; column += 1) if (occupied.has(`${row}:${column}`)) return false;
    return true;
  }).sort((a, b) => a.y - b.y || a.x - b.x || a.id.localeCompare(b.id));
}

function connectedComponents(image) {
  const { width, height, pixels } = image;
  const seen = new Uint8Array(width * height); const queue = new Int32Array(width * height); const result = [];
  for (let first = 0; first < seen.length; first += 1) {
    if (seen[first] || pixels[first * 4 + 3] === 0) continue;
    let head = 0; let tail = 0; queue[tail++] = first; seen[first] = 1;
    let x0 = width; let y0 = height; let x1 = -1; let y1 = -1;
    while (head < tail) {
      const index = queue[head++]; const x = index % width; const y = Math.floor(index / width);
      x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
      for (let dy = -1; dy <= 1; dy += 1) for (let dx = -1; dx <= 1; dx += 1) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx; const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const next = ny * width + nx;
        if (seen[next] || pixels[next * 4 + 3] === 0) continue;
        seen[next] = 1; queue[tail++] = next;
      }
    }
    result.push({ x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1, area: tail });
  }
  return result.sort((a, b) => a.y - b.y || a.x - b.x);
}

function detectEffects(image) {
  const raw = connectedComponents(image).filter((component) => component.area >= 2);
  const merged = [];
  for (const component of raw) {
    let box = { ...component, mergedParts: 1 };
    let changed = true;
    while (changed) {
      changed = false;
      for (let index = merged.length - 1; index >= 0; index -= 1) {
        const prior = merged[index];
        const overlaps = box.x < prior.x + prior.width && box.x + box.width > prior.x && box.y < prior.y + prior.height && box.y + box.height > prior.y;
        if (!overlaps) continue;
        box = {
          x: Math.min(box.x, prior.x), y: Math.min(box.y, prior.y),
          width: Math.max(box.x + box.width, prior.x + prior.width) - Math.min(box.x, prior.x),
          height: Math.max(box.y + box.height, prior.y + prior.height) - Math.min(box.y, prior.y),
          area: box.area + prior.area, mergedParts: box.mergedParts + prior.mergedParts,
        };
        merged.splice(index, 1); changed = true;
      }
    }
    merged.push(box);
  }
  merged.sort((a, b) => a.y - b.y || a.x - b.x);
  return merged.map((box, index) => ({
    id: `effects-${String(index + 1).padStart(4, "0")}`, sheet: "effects",
    x: box.x, y: box.y, width: box.width, height: box.height,
    category: effectColorCategory(image, box),
    detection: "connected-components", needsReview: box.mergedParts > 1,
    ...(box.mergedParts > 1 ? { mergedParts: box.mergedParts } : {}),
  }));
}

function detectCharacters(image, spec) {
  const raw = connectedComponents(image).filter((component) => component.area >= 3);
  const sprites = []; const occupied = new Set(); const pendingLarge = [];
  for (const component of raw) {
    if (component.width <= 20 && component.height <= 36) {
      const row = Math.floor(component.y / GRID); const column = Math.floor(component.x / GRID);
      sprites.push({ ...component, id: `${spec.id}-r${String(row).padStart(2, "0")}-c${String(column).padStart(2, "0")}-p${String(sprites.length + 1).padStart(3, "0")}`, sheet: spec.id, category: categoryForCharacter(row, column), detection: "component", needsReview: false });
    } else pendingLarge.push(component);
  }
  // Components that touch several sprites are separated on the verified 16px logical grid.
  for (const component of pendingLarge) {
    const c0 = Math.floor(component.x / GRID); const c1 = Math.floor((component.x + component.width - 1) / GRID);
    const r0 = Math.floor(component.y / GRID); const r1 = Math.floor((component.y + component.height - 1) / GRID);
    for (let row = r0; row <= r1; row += 1) for (let column = c0; column <= c1; column += 1) {
      const x = column * GRID; const y = row * GRID;
      const width = Math.min(GRID, image.width - x); const height = Math.min(GRID, image.height - y);
      if (width <= 0 || height <= 0 || cellHasPixels(image, x, y, width, height) < 3) continue;
      const key = `${row}:${column}`; if (occupied.has(key)) continue; occupied.add(key);
      sprites.push({
        id: `${spec.id}-r${String(row).padStart(2, "0")}-c${String(column).padStart(2, "0")}`,
        sheet: spec.id, x, y, width, height, category: categoryForCharacter(row, column), row, column,
        detection: "component-grid-split", needsReview: true,
      });
    }
  }
  const filtered = sprites.filter((sprite) => {
    if (sprite.detection === "component-grid-split") return true;
    const minColumn = Math.floor(sprite.x / GRID); const maxColumn = Math.floor((sprite.x + sprite.width - 1) / GRID);
    const minRow = Math.floor(sprite.y / GRID); const maxRow = Math.floor((sprite.y + sprite.height - 1) / GRID);
    for (let row = minRow; row <= maxRow; row += 1) for (let column = minColumn; column <= maxColumn; column += 1) if (occupied.has(`${row}:${column}`)) return false;
    return true;
  });
  return filtered.sort((a, b) => a.y - b.y || a.x - b.x).map((sprite, index) => ({ ...sprite, _sort: index }));
}

function makeSprites(image, spec) {
  if (spec.id === "items") return detectItems(image, spec);
  if (spec.detector === "grid") return detectGrid(image, spec);
  if (spec.detector === "characters") return detectCharacters(image, spec);
  const effects = detectEffects(image);
  return effects;
}

export function applyOverrides(sprites, overrides, sheetId = null) {
  const removed = new Set(overrides.removeIds ?? []);
  const adjusted = sprites.filter((sprite) => !removed.has(sprite.id)).map((sprite) => {
    const override = overrides.sprites?.[sprite.id];
    return override ? { ...sprite, ...override, id: sprite.id, overridden: true } : sprite;
  });
  for (const sprite of overrides.add ?? []) if (!sheetId || sprite.sheet === sheetId) adjusted.push({ ...sprite, overridden: true, detection: "manual" });
  return adjusted;
}

export function validateAtlas(sprites, sheets) {
  const ids = new Set();
  for (const sprite of sprites) {
    if (!sprite.id || ids.has(sprite.id)) throw new Error(`Duplicate or missing sprite id: ${sprite.id}`);
    ids.add(sprite.id);
    const sheet = sheets[sprite.sheet];
    if (!sheet) throw new Error(`${sprite.id} refers to unknown sheet ${sprite.sheet}`);
    for (const field of ["x", "y", "width", "height"]) if (!Number.isInteger(sprite[field])) throw new Error(`${sprite.id}.${field} must be an integer`);
    if (sprite.x < 0 || sprite.y < 0 || sprite.width <= 0 || sprite.height <= 0 || sprite.x + sprite.width > sheet.width || sprite.y + sprite.height > sheet.height) throw new Error(`${sprite.id} is outside ${sprite.sheet}`);
    if (typeof sprite.category !== "string" || !sprite.category.trim()) throw new Error(`${sprite.id} has no category`);
  }
  for (let first = 0; first < sprites.length; first += 1) for (let second = first + 1; second < sprites.length; second += 1) {
    const a = sprites[first]; const b = sprites[second];
    if (a.sheet !== b.sheet) continue;
    const overlaps = a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    if (overlaps) throw new Error(`Overlapping sprite boxes: ${a.id} and ${b.id}`);
  }
  return true;
}

export async function buildSpriteAtlas({ root = ROOT } = {}) {
  const sourceRoot = path.join(root, "assets", "sprites", "source");
  const outputRoot = path.join(root, "assets", "sprites");
  const atlasPath = path.join(root, "assets", "atlas.json");
  const overridesPath = path.join(root, "assets", "atlas-overrides.json");
  let overrides = { sprites: {}, add: [], removeIds: [] };
  try { overrides = { ...overrides, ...JSON.parse(await fs.readFile(overridesPath, "utf8")) }; }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const sheets = {}; const allSprites = []; const warnings = [];
  for (const spec of SHEET_SPECS) {
    const sourcePath = path.join(sourceRoot, spec.source);
    let source;
    try { source = decodePng(await fs.readFile(sourcePath)); }
    catch (error) { throw new Error(`Cannot read source sheet ${spec.source}: ${error.message}`); }
    const matte = removeConnectedMatte(source);
    const image = spec.scale === 1 ? matte : nearestNormalize(matte, spec.scale, spec.offsetX, spec.offsetY);
    await fs.mkdir(outputRoot, { recursive: true });
    await fs.writeFile(path.join(outputRoot, spec.file), encodePng(image.width, image.height, image.pixels));
    const sheet = { file: `assets/sprites/${spec.file}`, width: image.width, height: image.height, sourceFile: spec.source, sourceSize: { width: source.width, height: source.height }, sourceScale: spec.scale, sourceOffset: { x: spec.offsetX, y: spec.offsetY }, matte: matte.matte, removedMattePixels: matte.removed };
    sheets[spec.id] = sheet;
    const detected = makeSprites(image, spec);
    for (const sprite of detected) {
      if (sprite.needsReview) warnings.push({ id: sprite.id, sheet: sprite.sheet, reason: sprite.detection === "component-grid-split" ? "component touched multiple 16px cells; review crop" : "sprite touches/joins neighboring cells; review crop" });
    }
    allSprites.push(...applyOverrides(detected, overrides, spec.id));
  }
  validateAtlas(allSprites, sheets);
  allSprites.sort((a, b) => SHEET_SPECS.findIndex((spec) => spec.id === a.sheet) - SHEET_SPECS.findIndex((spec) => spec.id === b.sheet) || a.y - b.y || a.x - b.x || a.id.localeCompare(b.id));
  const categoryIndex = Object.fromEntries(SUPPORTED_CATEGORIES.map((category) => [category, []]));
  for (const sprite of allSprites) {
    categoryIndex[sprite.category] ??= [];
    sprite.levelIndex = categoryIndex[sprite.category].length;
    categoryIndex[sprite.category].push(sprite.id);
  }
  const atlas = {
    version: 1,
    generatedBy: "tools/build-sprite-atlas.mjs",
    pixelArt: { smoothing: false, scale: "integer", recommendedScales: [2, 3, 4] },
    sheets,
    categories: categoryIndex,
    sprites: allSprites,
    warnings,
    sourceNote: "Original uploads were not present under the requested Captura_de_tela_* filenames. The content-matching user-provided sheets in assets/sprites/source were mapped by their visible contents; review source provenance in CREDITS.md.",
  };
  await fs.mkdir(path.dirname(atlasPath), { recursive: true });
  await fs.writeFile(atlasPath, `${JSON.stringify(atlas, null, 2)}\n`);
  return atlas;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const atlas = await buildSpriteAtlas();
    console.log(`Built ${atlas.sprites.length} sprites in ${Object.keys(atlas.categories).length} categories.`);
    console.log(`${atlas.warnings.length} generated boxes are flagged for review in tools/sprite-browser.html.`);
  } catch (error) {
    console.error(error.stack ?? error);
    process.exitCode = 1;
  }
}
