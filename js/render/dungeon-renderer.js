import { TILE } from "../core/map/tiles.js";

const PREVIEW = Object.freeze({
  wall: "#202925", wallEdge: "#293630", floorA: "#59685a", floorB: "#4d5c50",
  corridorA: "#3e5047", corridorB: "#46584d", stairs: "#dba35d", start: "#8bd1b0",
});
const GAME = Object.freeze({
  hidden: "#090d0c", wall: "#26302b", wallSeen: "#17201c", floor: "#506052", floorDim: "#202a25",
  corridor: "#3c4a41", corridorDim: "#1a211d", stairs: "#ddaa60", shop: "#77c8b0",
  treasure: "#e5bd6e", event: "#a98bd8", boss: "#d06e56", player: "#e4e8d6",
  sentry: "#c88757", wolf: "#cc6c55", wraith: "#83c9d0", bossEnemy: "#df735e",
});

function layoutFor(map, width, height) {
  const tileSize = Math.max(1, Math.floor(Math.min(width / map.width, height / map.height)));
  const drawWidth = tileSize * map.width;
  const drawHeight = tileSize * map.height;
  return { tileSize, offsetX: Math.floor((width - drawWidth) / 2), offsetY: Math.floor((height - drawHeight) / 2) };
}

export function drawDungeon(context, map, pixelWidth, pixelHeight) {
  context.clearRect(0, 0, pixelWidth, pixelHeight);
  context.fillStyle = "#101614";
  context.fillRect(0, 0, pixelWidth, pixelHeight);
  const { tileSize, offsetX, offsetY } = layoutFor(map, pixelWidth, pixelHeight);
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const tile = map.tiles[y * map.width + x];
      let color = PREVIEW.wall;
      if (tile === TILE.FLOOR) color = ((x * 7 + y * 13) % 5 < 2) ? PREVIEW.floorA : PREVIEW.floorB;
      else if (tile === TILE.CORRIDOR) color = ((x + y) % 2 === 0) ? PREVIEW.corridorA : PREVIEW.corridorB;
      else if (tile === TILE.STAIRS_DOWN) color = PREVIEW.stairs;
      if (map.start.x === x && map.start.y === y) color = PREVIEW.start;
      context.fillStyle = color;
      context.fillRect(offsetX + x * tileSize, offsetY + y * tileSize, tileSize, tileSize);
      if (tile === TILE.WALL && tileSize >= 5) {
        context.fillStyle = PREVIEW.wallEdge;
        context.fillRect(offsetX + x * tileSize, offsetY + y * tileSize, tileSize, 1);
      }
    }
  }
  if (tileSize >= 8) {
    context.fillStyle = "#101614";
    context.font = `bold ${Math.max(8, Math.floor(tileSize * 0.55))}px ui-monospace, monospace`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("↓", offsetX + (map.stairs.x + 0.5) * tileSize, offsetY + (map.stairs.y + 0.5) * tileSize);
  }
}

function tileColor(tile, explored, visible, x, y) {
  if (!explored) return GAME.hidden;
  const dim = !visible;
  if (tile === TILE.WALL) return dim ? GAME.wallSeen : GAME.wall;
  if (tile === TILE.CORRIDOR) return dim ? GAME.corridorDim : GAME.corridor;
  if (dim) return GAME.floorDim;
  if (tile === TILE.STAIRS_DOWN || tile === TILE.STAIRS_UP) return GAME.stairs;
  if (tile === TILE.SHOP) return GAME.shop;
  if (tile === TILE.TREASURE) return GAME.treasure;
  if (tile === TILE.EVENT) return GAME.event;
  if (tile === TILE.BOSS) return GAME.boss;
  return ((x * 7 + y * 13) % 5 < 2) ? GAME.floor : "#465447";
}

function marker(context, text, x, y, size, color) {
  context.fillStyle = color;
  context.font = `bold ${Math.max(8, Math.floor(size * 0.75))}px ui-monospace, monospace`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(text, x, y + 0.5);
}

export function drawGame(context, state, pixelWidth, pixelHeight) {
  context.clearRect(0, 0, pixelWidth, pixelHeight);
  context.fillStyle = "#0b100e";
  context.fillRect(0, 0, pixelWidth, pixelHeight);
  const { map } = state;
  const { tileSize, offsetX, offsetY } = layoutFor(map, pixelWidth, pixelHeight);
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const index = y * map.width + x;
      const explored = state.explored?.[index] === 1;
      const visible = state.visible?.[index] === 1;
      context.fillStyle = tileColor(map.tiles[index], explored, visible, x, y);
      context.fillRect(offsetX + x * tileSize, offsetY + y * tileSize, tileSize, tileSize);
      if (visible && map.tiles[index] === TILE.WALL && tileSize >= 6) {
        context.fillStyle = "#354139";
        context.fillRect(offsetX + x * tileSize, offsetY + y * tileSize, tileSize, 1);
      }
      if (visible && tileSize >= 10) {
        const feature = state.features.find((entry) => !entry.used && entry.x === x && entry.y === y);
        if (feature) {
          const glyph = feature.type === "shop" ? "$" : feature.type === "treasure" ? "□" : feature.type === "event" ? "✦" : "♜";
          const color = feature.type === "shop" ? "#10231f" : feature.type === "treasure" ? "#2a2110" : "#1c1725";
          marker(context, glyph, offsetX + (x + 0.5) * tileSize, offsetY + (y + 0.5) * tileSize, tileSize, color);
        }
      }
    }
  }

  for (const drop of state.drops) {
    const index = drop.y * map.width + drop.x;
    if (drop.collected || state.visible?.[index] !== 1) continue;
    const x=offsetX+(drop.x+0.5)*tileSize; const y=offsetY+(drop.y+0.5)*tileSize;
    context.save(); context.shadowColor=drop.item.color??GAME.treasure; context.shadowBlur=4+(drop.item.rarityGlow??0.3)*7;
    marker(context,"✦",x,y,tileSize,drop.item.color??GAME.treasure); context.restore();
  }
  for (const enemy of state.enemies) {
    if (!enemy.alive || state.visible?.[enemy.y * map.width + enemy.x] !== 1) continue;
    const color = enemy.type === "ashen-sentry" ? GAME.sentry : enemy.type === "ember-wolf" ? GAME.wolf : enemy.type === "vault-warden" ? GAME.bossEnemy : GAME.wraith;
    const px = offsetX + (enemy.x + 0.5) * tileSize;
    const py = offsetY + (enemy.y + 0.5) * tileSize;
    context.fillStyle = "#1a1411";
    context.fillRect(px - tileSize * 0.34, py - tileSize * 0.36, tileSize * 0.68, tileSize * 0.72);
    marker(context, enemy.type === "vault-warden" ? "W" : enemy.type === "ember-wolf" ? "w" : enemy.type === "mourning-wraith" ? "~" : "s", px, py, tileSize, color);
    if (tileSize >= 8) {
      context.fillStyle = "#140f0e";
      context.fillRect(px - tileSize * 0.35, py + tileSize * 0.35, tileSize * 0.7, Math.max(2, tileSize * 0.11));
      context.fillStyle = "#e37562";
      context.fillRect(px - tileSize * 0.35, py + tileSize * 0.35, tileSize * 0.7 * Math.max(0, enemy.hp / enemy.maxHp), Math.max(2, tileSize * 0.11));
    }
  }

  const playerX = offsetX + (state.player.x + 0.5) * tileSize;
  const playerY = offsetY + (state.player.y + 0.5) * tileSize;
  context.fillStyle = "#e6c17a";
  context.beginPath();
  context.arc(playerX, playerY, Math.max(3, tileSize * 0.36), 0, Math.PI * 2);
  context.fill();
  context.fillStyle = GAME.player;
  context.beginPath();
  context.arc(playerX, playerY - tileSize * 0.04, Math.max(2, tileSize * 0.22), 0, Math.PI * 2);
  context.fill();
  return { tileSize, offsetX, offsetY };
}

export function drawMinimap(context, state, pixelWidth, pixelHeight) {
  context.clearRect(0, 0, pixelWidth, pixelHeight);
  context.fillStyle = "#0a0e0d";
  context.fillRect(0, 0, pixelWidth, pixelHeight);
  const { map } = state;
  const cellWidth = pixelWidth / map.width;
  const cellHeight = pixelHeight / map.height;
  for (let y = 0; y < map.height; y += 1) {
    for (let x = 0; x < map.width; x += 1) {
      const index = y * map.width + x;
      if (!state.explored?.[index]) continue;
      const color = state.visible?.[index] ? (map.tiles[index] === TILE.WALL ? "#728078" : "#93b69e") : (map.tiles[index] === TILE.WALL ? "#27322c" : "#425247");
      context.fillStyle = color;
      context.fillRect(x * cellWidth, y * cellHeight, Math.ceil(cellWidth), Math.ceil(cellHeight));
    }
  }
  context.fillStyle = "#e8c27b";
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
