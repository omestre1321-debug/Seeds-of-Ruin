import { BIOMES } from "../data/biomes.js";
import { TILE } from "../core/map/tiles.js";
import { drawBiomeStatic } from "./biome-renderer.js";

const GAME = Object.freeze({
  hidden: "#080a0d", player: "#f2e3c0", sentry: "#c88757", wolf: "#cc6c55",
  wraith: "#83c9d0", bossEnemy: "#df735e",
});

export function layoutFor(map, width, height) {
  const tileSize = Math.max(1, Math.floor(Math.min(width / map.width, height / map.height)));
  const drawWidth = tileSize * map.width;
  const drawHeight = tileSize * map.height;
  return { tileSize, offsetX: Math.floor((width - drawWidth) / 2), offsetY: Math.floor((height - drawHeight) / 2) };
}

function biomeForCell(map, index) {
  return BIOMES[map.biomeByTile?.[index] ?? map.biomeId] ?? BIOMES.stone;
}

function rgba(hex, alpha) {
  const value = Number.parseInt(hex.slice(1), 16);
  return `rgba(${value >> 16},${(value >> 8) & 255},${value & 255},${Math.max(0, Math.min(1, alpha))})`;
}

function marker(context, text, x, y, size, color) {
  context.fillStyle = color;
  context.font = `bold ${Math.max(8, Math.floor(size * 0.75))}px ui-monospace, monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, x, y + 0.5);
}

function drawFeatureMarkers(context, state, layout) {
  const { map } = state;
  const { tileSize, offsetX, offsetY } = layout;
  const features = new Map(state.features.map((feature) => [`${feature.x},${feature.y}`, feature]));
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      if (state.visible?.[y * map.width + x] !== 1) continue;
      const feature = features.get(`${x},${y}`);
      if (!feature || (feature.used && feature.type !== "boss") || tileSize < 7) continue;
      const biome = BIOMES[feature.biomeId ?? map.biomeId] ?? BIOMES.stone;
      const glyph = feature.type === "shop" ? "◇" : feature.type === "treasure" ? "▣" : feature.type === "event" ? "✦" : "♜";
      const color = feature.type === "boss" ? "#f1a18c" : biome.palette.accent;
      marker(context, glyph, offsetX + (x + 0.5) * tileSize, offsetY + (y + 0.5) * tileSize, tileSize, color);
    }
  }
}

function drawFog(context, state, layout) {
  const { map } = state;
  const { tileSize, offsetX, offsetY } = layout;
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const index = y * map.width + x;
      const visible = state.visible?.[index] === 1;
      const explored = state.explored?.[index] === 1;
      if (visible) continue;
      const biome = biomeForCell(map, index);
      context.fillStyle = explored ? rgba(biome.palette.deep, 0.67) : biome.palette.fog;
      context.fillRect(offsetX + x * tileSize, offsetY + y * tileSize, tileSize + 0.25, tileSize + 0.25);
    }
  }
}

export function drawDungeon(context, map, pixelWidth, pixelHeight) {
  context.clearRect(0, 0, pixelWidth, pixelHeight);
  const biome = BIOMES[map.biomeId] ?? BIOMES.stone;
  context.fillStyle = biome.palette.deep;
  context.fillRect(0, 0, pixelWidth, pixelHeight);
  const layout = layoutFor(map, pixelWidth, pixelHeight);
  drawBiomeStatic(context, map, layout);
  const { tileSize, offsetX, offsetY } = layout;
  marker(context, "↓", offsetX + (map.stairs.x + 0.5) * tileSize, offsetY + (map.stairs.y + 0.5) * tileSize, tileSize, biome.palette.accent);
  return layout;
}

export function drawGame(context, state, pixelWidth, pixelHeight, options = {}) {
  context.clearRect(0, 0, pixelWidth, pixelHeight);
  const { map } = state;
  const biome = BIOMES[map.biomeId] ?? BIOMES.stone;
  context.fillStyle = biome.palette.deep;
  context.fillRect(0, 0, pixelWidth, pixelHeight);
  const layout = layoutFor(map, pixelWidth, pixelHeight);
  drawBiomeStatic(context, map, layout);
  drawFog(context, state, layout);
  drawFeatureMarkers(context, state, layout);

  const { tileSize, offsetX, offsetY } = layout;
  for (const drop of state.drops ?? []) {
    const index = drop.y * map.width + drop.x;
    if (drop.collected || state.visible?.[index] !== 1) continue;
    const x = offsetX + (drop.x + 0.5) * tileSize;
    const y = offsetY + (drop.y + 0.5) * tileSize;
    const color = drop.item?.color ?? biome.palette.accent;
    context.save(); context.shadowColor = color; context.shadowBlur = 4 + (drop.item?.rarityGlow ?? 0.3) * 7;
    marker(context, "✦", x, y, tileSize, color); context.restore();
  }
  for (const enemy of state.enemies ?? []) {
    if (!enemy.alive || state.visible?.[enemy.y * map.width + enemy.x] !== 1) continue;
    const color = enemy.type === "ashen-sentry" ? GAME.sentry : enemy.type === "ember-wolf" ? GAME.wolf : enemy.type === "vault-warden" ? GAME.bossEnemy : GAME.wraith;
    const px = offsetX + (enemy.x + 0.5) * tileSize;
    const py = offsetY + (enemy.y + 0.5) * tileSize;
    context.fillStyle = "#101316";
    context.fillRect(px - tileSize * 0.34, py - tileSize * 0.36, tileSize * 0.68, tileSize * 0.72);
    marker(context, enemy.type === "vault-warden" ? "W" : enemy.type === "ember-wolf" ? "w" : enemy.type === "mourning-wraith" ? "~" : "s", px, py, tileSize, color);
    if (tileSize >= 8) {
      context.fillStyle = "#100f11";
      context.fillRect(px - tileSize * 0.35, py + tileSize * 0.35, tileSize * 0.7, Math.max(2, tileSize * 0.11));
      context.fillStyle = "#e37562";
      context.fillRect(px - tileSize * 0.35, py + tileSize * 0.35, tileSize * 0.7 * Math.max(0, enemy.hp / enemy.maxHp), Math.max(2, tileSize * 0.11));
    }
  }

  const playerX = offsetX + (state.player.x + 0.5) * tileSize;
  const playerY = offsetY + (state.player.y + 0.5) * tileSize;
  if (options.drawCharacter !== false && options.characterRenderer && state.player.character) {
    options.characterRenderer.draw(context, playerX, playerY, tileSize * 1.35, state.player.character, state.player.equipment, { direction: state.player.facing, moving: Boolean(options.moving), time: options.time ?? 0, flash: options.flash ?? 0 });
  } else if (options.drawCharacter !== false) {
    context.fillStyle = biome.palette.accent; context.beginPath(); context.arc(playerX, playerY, Math.max(3, tileSize * 0.36), 0, Math.PI * 2); context.fill();
    context.fillStyle = GAME.player; context.beginPath(); context.arc(playerX, playerY - tileSize * 0.04, Math.max(2, tileSize * 0.22), 0, Math.PI * 2); context.fill();
  }
  return { ...layout, playerX, playerY };
}

export function drawMinimap(context, state, pixelWidth, pixelHeight) {
  context.clearRect(0, 0, pixelWidth, pixelHeight);
  context.fillStyle = "#080a0c";
  context.fillRect(0, 0, pixelWidth, pixelHeight);
  const { map } = state;
  const cellWidth = pixelWidth / map.width;
  const cellHeight = pixelHeight / map.height;
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const index = y * map.width + x;
      if (!state.explored?.[index]) continue;
      const biome = biomeForCell(map, index);
      const wall = map.tiles[index] === TILE.WALL;
      context.fillStyle = state.visible?.[index] ? (wall ? biome.palette.wallEdge : biome.palette.accent) : (wall ? biome.palette.deep : biome.palette.wallFace);
      context.fillRect(x * cellWidth, y * cellHeight, Math.ceil(cellWidth), Math.ceil(cellHeight));
    }
  }
  context.fillStyle = "#f4e3bd";
  context.fillRect(state.player.x * cellWidth, state.player.y * cellHeight, Math.max(2, cellWidth), Math.max(2, cellHeight));
}

export function screenToTile(canvas, map, clientX, clientY) {
  const bounds = canvas.getBoundingClientRect();
  const scaleX = canvas.width / bounds.width;
  const scaleY = canvas.height / bounds.height;
  const x = (clientX - bounds.left) * scaleX;
  const y = (clientY - bounds.top) * scaleY;
  const layout = layoutFor(map, canvas.width, canvas.height);
  const tileX = Math.floor((x - layout.offsetX) / layout.tileSize);
  const tileY = Math.floor((y - layout.offsetY) / layout.tileSize);
  if (tileX < 0 || tileY < 0 || tileX >= map.width || tileY >= map.height) return null;
  return { x: tileX, y: tileY };
}
