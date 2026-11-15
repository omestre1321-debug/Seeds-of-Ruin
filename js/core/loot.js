import { RARITIES, getRarity } from "../items/rarity.js";

export { RARITIES, getRarity };

const ITEM_NAMES = Object.freeze({
  weapon: ["Coalglass Knife", "Sootfang", "Cinderbrand", "Vault Pick", "Last Spark"],
  armor: ["Ashweave Mantle", "Basalt Cuirass", "Keeper's Coat", "Smokebound Vest"],
  helmet: ["Lantern Hood", "Cinder Crown", "Hollow Visor", "Warden's Mask"],
  boots: ["Quiet Treads", "Basalt Greaves", "Ashen Steps", "Emberwalkers"],
  ring: ["Ember Eye", "Quiet Bell", "Warden's Thread", "Glass Sigil"],
  amulet: ["Last-Light Locket", "Cairn Heart", "Sable Pendant", "Coal Saint"],
  tonic: ["Warmth Tonic", "Ashroot Draught", "Last-Light Flask"],
  material: ["Cinder Shard", "Vault Thread", "Glass Coal", "Sooted Brass"],
});

const PREFIXES = Object.freeze(["Hollow", "Sable", "Drowned", "Bright", "Forgotten", "Waking", "Old"]);
const STAT_POOLS = Object.freeze({
  weapon: ["attack", "crit", "speed", "lifeSteal", "reach"],
  armor: ["defense", "maxHp", "thorns", "lifeSteal"],
  helmet: ["defense", "vision", "crit", "maxHp", "speed"],
  boots: ["speed", "defense", "vision", "crit", "maxHp"],
  ring: ["attack", "defense", "crit", "speed", "vision", "lifeSteal", "thorns", "maxHp", "reach"],
  amulet: ["maxHp", "vision", "crit", "lifeSteal", "thorns", "defense", "reach"],
});
const STAT_BASE = Object.freeze({ attack: 1, defense: 1, maxHp: 4, crit: 0.03, speed: 0.12, vision: 1, lifeSteal: 0.025, thorns: 1, reach: 1 });
const FRACTIONAL_STATS = new Set(["crit", "speed", "lifeSteal"]);

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

function statValue(stat, floor, multiplier) {
  const base = STAT_BASE[stat];
  if (FRACTIONAL_STATS.has(stat)) return Number((base * multiplier * (1 + (floor - 1) * 0.12)).toFixed(3));
  return Math.max(1, Math.round(base * multiplier * (1 + (floor - 1) * 0.16)));
}

function sampleAttributes(rng, type, rarity) {
  const pool = STAT_POOLS[type].filter((stat) => stat !== "reach" || ["epic", "legendary"].includes(rarity.id));
  const shuffled = [...pool];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swap = rng.int(0, index);
    [shuffled[index], shuffled[swap]] = [shuffled[swap], shuffled[index]];
  }
  return shuffled.slice(0, Math.min(rarity.attributes, shuffled.length));
}

export function createLoot(rng, floor = 1, options = {}) {
  if (!Number.isInteger(floor) || floor < 1) throw new RangeError("Loot floor must be a positive integer");
  const rarity = chooseRarity(rng, options.rarity);
  const types = options.type ? [options.type] : Object.keys(ITEM_NAMES);
  const type = rng.pick(types);
  const names = ITEM_NAMES[type];
  if (!names) throw new RangeError(`Unknown item type: ${type}`);
  const name = `${rarity.label} ${rng.pick(PREFIXES)} ${rng.pick(names)}`;
  const stackable = type === "tonic" || type === "material";
  const item = {
    id: `drop-${rng.nextUint32().toString(16).padStart(8, "0")}`,
    name,
    type,
    slot: type,
    rarity: rarity.id,
    color: rarity.color,
    rarityGlow: rarity.glow,
    floor,
    value: Math.max(2, Math.floor(5 * rarity.multiplier * (1 + (floor - 1) * 0.25))),
    stackable,
    quantity: 1,
    stackType: type === "material" ? names[0] : type,
    attack: 0, defense: 0, maxHp: 0, crit: 0, speed: 0, vision: 0, lifeSteal: 0, thorns: 0, reach: 0,
    heal: 0,
  };
  if (stackable) {
    if (type === "tonic") item.heal = Math.max(8, Math.round(12 * rarity.multiplier * (1 + (floor - 1) * 0.15)));
    return item;
  }
  for (const stat of sampleAttributes(rng, type, rarity)) item[stat] = statValue(stat, floor, rarity.multiplier);
  return item;
}
