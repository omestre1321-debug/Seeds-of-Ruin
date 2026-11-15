export const RARITIES = Object.freeze([
  { id: "common", label: "Common", weight: 0.55, multiplier: 1, color: "#aeb8ad" },
  { id: "uncommon", label: "Uncommon", weight: 0.27, multiplier: 1.45, color: "#79c894" },
  { id: "rare", label: "Rare", weight: 0.14, multiplier: 2.1, color: "#7eb6e7" },
  { id: "epic", label: "Epic", weight: 0.04, multiplier: 3.1, color: "#d49ae8" },
]);

const BASE_ITEMS = Object.freeze({
  weapon: ["Coalglass Knife", "Sootfang", "Cinderbrand", "Vault Pick", "Last Spark"],
  armor: ["Ashweave Mantle", "Basalt Cuirass", "Keeper's Coat", "Smokebound Vest"],
  charm: ["Ember Eye", "Quiet Bell", "Warden's Thread", "Glass Sigil"],
  tonic: ["Warmth Tonic", "Ashroot Draught", "Last-Light Flask"],
});

const PREFIXES = Object.freeze(["Hollow", "Sable", "Drowned", "Bright", "Forgotten", "Waking", "Old" ]);

function chooseRarity(rng, forcedRarity) {
  if (forcedRarity) {
    const found = RARITIES.find((rarity) => rarity.id === forcedRarity);
    if (!found) throw new RangeError(`Unknown rarity: ${forcedRarity}`);
    return found;
  }
  const roll = rng.next();
  let accumulated = 0;
  for (const rarity of RARITIES) {
    accumulated += rarity.weight;
    if (roll < accumulated) return rarity;
  }
  return RARITIES[0];
}

export function createLoot(rng, floor = 1, options = {}) {
  if (!Number.isInteger(floor) || floor < 1) throw new RangeError("Loot floor must be a positive integer");
  const rarity = chooseRarity(rng, options.rarity);
  const slots = options.type ? [options.type] : ["weapon", "armor", "charm", "tonic"];
  const type = rng.pick(slots);
  const names = BASE_ITEMS[type];
  if (!names) throw new RangeError(`Unknown item type: ${type}`);
  const name = `${rarity.label} ${rng.pick(PREFIXES)} ${rng.pick(names)}`;
  const power = rarity.multiplier * (1 + Math.floor((floor - 1) * 0.65));
  const item = {
    id: `drop-${rng.nextUint32().toString(16).padStart(8, "0")}`,
    name,
    type,
    slot: type === "weapon" ? "weapon" : type === "armor" ? "armor" : type === "charm" ? "charm" : "consumable",
    rarity: rarity.id,
    color: rarity.color,
    floor,
    value: Math.max(2, Math.floor(5 * power)),
    attack: type === "weapon" ? Math.max(1, Math.round(2 * power)) : 0,
    defense: type === "armor" ? Math.max(1, Math.round(power)) : 0,
    crit: type === "charm" ? Number((0.04 * power).toFixed(3)) : 0,
    heal: type === "tonic" ? Math.max(8, Math.round(12 * power)) : 0,
  };
  return item;
}

export function addToInventory(player, item, capacity = 12) {
  if (!Array.isArray(player.inventory)) player.inventory = [];
  if (player.inventory.length >= capacity) return { ok: false, reason: "full" };
  if (player.inventory.some((entry) => entry.id === item.id)) return { ok: false, reason: "duplicate" };
  player.inventory.push(structuredClone(item));
  return { ok: true };
}

export function equipItem(player, itemId) {
  const item = player.inventory?.find((entry) => entry.id === itemId);
  if (!item || !["weapon", "armor", "charm"].includes(item.slot)) return false;
  if (!player.equipment) player.equipment = { weapon: null, armor: null, charm: null };
  player.equipment[item.slot] = item.id;
  return true;
}

export function equipmentBonuses(player) {
  const equipped = new Set(Object.values(player.equipment ?? {}).filter(Boolean));
  const totals = { attack: 0, defense: 0, crit: 0 };
  for (const item of player.inventory ?? []) {
    if (equipped.has(item.id)) {
      totals.attack += item.attack ?? 0;
      totals.defense += item.defense ?? 0;
      totals.crit += item.crit ?? 0;
    }
  }
  totals.crit = Math.min(0.5, totals.crit);
  return totals;
}

export function consumeTonic(player, itemId) {
  const index = player.inventory?.findIndex((item) => item.id === itemId) ?? -1;
  if (index < 0) return { ok: false, reason: "missing" };
  const item = player.inventory[index];
  if (item.slot !== "consumable" || item.heal <= 0) return { ok: false, reason: "not-consumable" };
  const healed = Math.min(player.maxHp - player.hp, item.heal);
  if (healed <= 0) return { ok: false, reason: "already-healthy" };
  player.hp += healed;
  player.inventory.splice(index, 1);
  return { ok: true, healed };
}
