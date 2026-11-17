const RARITY_ORDER = Object.freeze(["common", "uncommon", "rare", "epic", "legendary"]);
const INTEGER_SCALES = Object.freeze([1, 2, 3, 4]);

export function categoryForItem(item = {}) {
  if (typeof item.spriteCategory === "string" && item.spriteCategory) return item.spriteCategory;
  const type = String(item.type ?? item.slot ?? "").toLowerCase();
  const name = `${item.name ?? ""} ${item.materialId ?? ""}`.toLowerCase();
  if (type === "weapon") {
    if (/bow|arrow|reed/.test(name)) return "weapon_bow";
    if (/staff|rod|wand|spark/.test(name)) return "weapon_staff";
    if (/pick|axe|cleaver/.test(name)) return "weapon_axe";
    if (/mace|hammer|club/.test(name)) return "weapon_mace";
    return "weapon_sword";
  }
  if (type === "armor" || type === "chest_armor") return "chest_armor";
  if (type === "helmet") return "helmet";
  if (type === "boots") return "boots";
  if (type === "gloves") return "gloves";
  if (type === "shield") return "shield";
  if (type === "ring") return "ring";
  if (type === "amulet") return "amulet";
  if (type === "tonic" || type === "potion" || type === "consumable") return "potion";
  if (type === "food") return "food";
  if (type === "book" || type === "scroll") return "book";
  if (type === "key") return "key";
  if (type === "gem") return "gem";
  if (type === "herb") return "herb";
  if (type === "material") return /thread|herb|root|leaf|mushroom/.test(name) ? "herb" : "gem";
  return "gem";
}

export function spriteIdForCategory(atlas, category, { rarity = "common", floor = 1 } = {}) {
  const ids = atlas?.categories?.[category];
  if (!Array.isArray(ids) || ids.length === 0) return null;
  const rarityRank = Math.max(0, RARITY_ORDER.indexOf(rarity));
  const floorValue=Number.isFinite(Number(floor))?Number(floor):1;
  const floorRank = Math.max(0, Math.min(1, (floorValue - 1) / 4));
  const progression = Math.max(0, Math.min(1, rarityRank * 0.72 / 4 + floorRank * 0.28));
  return ids[Math.round(progression * (ids.length - 1))] ?? ids[0];
}

export function spriteIdForItem(atlas, item) {
  return spriteIdForCategory(atlas, categoryForItem(item), { rarity: item?.rarity, floor: item?.floor });
}

function makeDefaultBaseUrl() {
  try { return new URL("../../", import.meta.url); } catch { return ""; }
}

export function createSpriteAtlas({
  atlasUrl = null,
  baseUrl = makeDefaultBaseUrl(),
  fetchImpl = globalThis.fetch,
  ImageCtor = globalThis.Image,
  logger = globalThis.console,
} = {}) {
  const imageCache = new Map();
  const warnings = new Set();
  let atlas = null;
  let loadPromise = null;

  function warnOnce(key, message) {
    if (warnings.has(key)) return;
    warnings.add(key);
    try { logger?.warn?.(`[Ashen Reach sprites] ${message}`); } catch { /* logging must never break rendering */ }
  }

  function resolveUrl(value) {
    try { return new URL(value, baseUrl).href; } catch { return value; }
  }

  async function loadImage(sheetId, metadata) {
    if (imageCache.has(sheetId)) return imageCache.get(sheetId);
    if (typeof ImageCtor !== "function") {
      warnOnce(`image-api:${sheetId}`, `Image API unavailable for ${sheetId}; rendering placeholders.`);
      imageCache.set(sheetId, null); return null;
    }
    const promise = new Promise((resolve) => {
      let image;
      try { image = new ImageCtor(); } catch (error) { warnOnce(`image-create:${sheetId}`, `Could not create image for ${sheetId}: ${error.message}`); resolve(null); return; }
      const done = (value) => resolve(value);
      if (typeof image.decode === "function") {
        image.src = resolveUrl(metadata.file);
        image.decode().then(() => done(image)).catch((error) => { warnOnce(`image-load:${sheetId}`, `Sheet ${metadata.file} failed to load (${error.message}); placeholders will be used.`); done(null); });
      } else {
        image.onload = () => done(image);
        image.onerror = () => { warnOnce(`image-load:${sheetId}`, `Sheet ${metadata.file} failed to load; placeholders will be used.`); done(null); };
        image.src = resolveUrl(metadata.file);
      }
    });
    imageCache.set(sheetId, promise);
    const image = await promise;
    imageCache.set(sheetId, image);
    return image;
  }

  async function load() {
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
      if (typeof fetchImpl !== "function") { warnOnce("fetch-api", "fetch API unavailable; sprite placeholders will be used."); return { ok: false, atlas: null }; }
      try {
        const response = await fetchImpl(atlasUrl ?? resolveUrl("assets/atlas.json"));
        if (!response?.ok) throw new Error(`atlas request failed (${response?.status ?? "no response"})`);
        const data = await response.json();
        if (!data || typeof data !== "object" || !data.sheets || !Array.isArray(data.sprites)) throw new Error("atlas.json has an invalid schema");
        atlas = data;
        await Promise.all(Object.entries(atlas.sheets).map(([id, sheet]) => loadImage(id, sheet)));
        return { ok: true, atlas };
      } catch (error) {
        warnOnce("atlas-load", `Atlas failed to load (${error.message}); visible placeholders will be used.`);
        atlas = null;
        return { ok: false, atlas: null };
      }
    })();
    return loadPromise;
  }

  function resolveSprite(spriteId) {
    if (!atlas || typeof spriteId !== "string") return null;
    return atlas.sprites.find((sprite) => sprite.id === spriteId) ?? null;
  }

  function drawPlaceholder(context, x, y, width, height, label = "?") {
    const w = Math.max(8, Math.round(width)); const h = Math.max(8, Math.round(height));
    context.save();
    context.imageSmoothingEnabled = false;
    context.fillStyle = "#5c1d55"; context.fillRect(x, y, w, h);
    context.fillStyle = "#f14bd8";
    for (let py = 0; py < h; py += 6) for (let px = (py / 6 % 2) * 3; px < w; px += 6) context.fillRect(x + px, y + py, Math.min(2, w - px), Math.min(2, h - py));
    context.strokeStyle = "#ffc5f6"; context.lineWidth = 1; context.strokeRect(x + 0.5, y + 0.5, Math.max(1, w - 1), Math.max(1, h - 1));
    context.fillStyle = "#ffffff"; context.font = `bold ${Math.max(8, Math.min(16, Math.floor(Math.min(w, h) * 0.65)))}px monospace`; context.textAlign = "center"; context.textBaseline = "middle";
    context.fillText(label, x + w / 2, y + h / 2);
    context.restore();
  }

  function draw(context, spriteId, x, y, { scale = 2, flipX = false, alpha = 1, width = null, height = null } = {}) {
    const sprite = resolveSprite(spriteId);
    if (!sprite) {
      warnOnce(`missing-sprite:${spriteId}`, `Sprite '${spriteId ?? "(empty)"}' is missing from the atlas; drawing a placeholder.`);
      drawPlaceholder(context, Math.round(x), Math.round(y), width ?? 24, height ?? 24);
      return false;
    }
    const image = imageCache.get(sprite.sheet);
    if (!image || typeof image.then === "function") {
      warnOnce(`unready-sheet:${sprite.sheet}`, `Sheet '${sprite.sheet}' is not ready; drawing a placeholder until load completes.`);
      const factor = INTEGER_SCALES.includes(scale) ? scale : 1;
      drawPlaceholder(context, Math.round(x), Math.round(y), width ?? sprite.width * factor, height ?? sprite.height * factor);
      return false;
    }
    const integerScale = INTEGER_SCALES.includes(scale) ? scale : 1;
    const destinationWidth = width === null ? sprite.width * integerScale : Math.max(1, Math.round(width));
    const destinationHeight = height === null ? sprite.height * integerScale : Math.max(1, Math.round(height));
    const left = Math.round(x); const top = Math.round(y);
    context.save();
    context.imageSmoothingEnabled = false;
    context.globalAlpha = Math.max(0, Math.min(1, alpha));
    if (flipX) { context.translate(left + destinationWidth, 0); context.scale(-1, 1); }
    context.drawImage(image, sprite.x, sprite.y, sprite.width, sprite.height, flipX ? 0 : left, top, destinationWidth, destinationHeight);
    context.restore();
    return true;
  }

  function getSprite(spriteId) { return resolveSprite(spriteId); }
  function getByCategory(category, options = {}) { return spriteIdForCategory(atlas, category, options); }

  return { load, draw, drawPlaceholder, get atlas() { return atlas; }, getSprite, getByCategory, warnings };
}
