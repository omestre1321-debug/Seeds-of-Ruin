import { RARITIES, getRarity } from "../items/rarity.js";

export { RARITIES, getRarity };

const ITEM_NAMES = Object.freeze({
  weapon: ["Coalglass Knife", "Sootfang", "Cinderbrand", "Vault Pick", "Last Spark"],
  shield: ["Cinder Buckler", "Warden Kite", "Glass Guard", "Ashen Roundshield"],
  gloves: ["Ashwrap Gloves", "Warden Grips", "Glass Mitts", "Cinder Knuckles"],
  armor: ["Ashweave Mantle", "Basalt Cuirass", "Keeper's Coat", "Smokebound Vest"],
  helmet: ["Lantern Hood", "Cinder Crown", "Hollow Visor", "Warden's Mask"],
  boots: ["Quiet Treads", "Basalt Greaves", "Ashen Steps", "Emberwalkers"],
  ring: ["Ember Eye", "Quiet Bell", "Warden's Thread", "Glass Sigil"],
  amulet: ["Last-Light Locket", "Cairn Heart", "Sable Pendant", "Coal Saint"],
  tonic: ["Warmth Tonic", "Ashroot Draught", "Last-Light Flask"],
  food: ["Ashberry", "Roasted Cave Hare", "Cinder Loaf", "Salted Mushroom"],
  scroll: ["Ember Script", "Wayfinder's Page", "Vault Canticle"],
  key: ["Rust Key", "Brass Ward Key", "Crypt Token"],
  gem: ["Cinder Shard", "Glass Coal", "Blue Vault Gem"],
  herb: ["Ashroot Sprig", "Ghostcap", "Bitter Fern"],
  material: ["Cinder Shard", "Vault Thread", "Glass Coal", "Sooted Brass"],
});

const PREFIXES = Object.freeze(["Hollow", "Sable", "Drowned", "Bright", "Forgotten", "Waking", "Old"]);
const STAT_POOLS = Object.freeze({
  weapon: ["attack", "crit", "speed", "lifeSteal", "reach"],
  shield: ["defense", "maxHp", "thorns", "speed"],
  gloves: ["attack", "defense", "speed", "crit"],
  armor: ["defense", "maxHp", "thorns", "lifeSteal", "speed", "vision"],
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

const ITEM_TYPE_WEIGHTS=Object.freeze({weapon:.10,shield:.05,gloves:.05,armor:.10,helmet:.10,boots:.10,ring:.10,amulet:.10,tonic:.10,material:.10,food:.05,scroll:.04,key:.03,gem:.04,herb:.04});
const SLOT_BY_TYPE=Object.freeze({weapon:"weapon",shield:"shield",gloves:"gloves",armor:"armor",helmet:"helmet",boots:"boots",ring:"ring",amulet:"amulet",tonic:"consumable",food:"consumable",scroll:"consumable",key:"material",gem:"material",herb:"material",material:"material"});
const MATERIAL_BY_RARITY=Object.freeze({common:"leather",uncommon:"iron",rare:"steel",epic:"obsidian",legendary:"giltsteel"});
function spriteCategory(type,name){
  const text=String(name).toLowerCase();
  if(type==="weapon")return /bow|reed/.test(text)?"weapon_bow":/staff|rod|spark/.test(text)?"weapon_staff":/pick|axe|cleaver/.test(text)?"weapon_axe":/mace|hammer/.test(text)?"weapon_mace":"weapon_sword";
  if(type==="armor")return "chest_armor";
  if(type==="tonic")return "potion";
  if(type==="scroll")return "book";
  if(type==="material")return /thread|brass/.test(text)?"herb":"gem";
  return type;
}
function chooseType(rng,types){
  const available=types.filter((type)=>ITEM_NAMES[type]);
  if(available.length===0)throw new RangeError("No known loot types were supplied");
  const total=available.reduce((sum,type)=>sum+(ITEM_TYPE_WEIGHTS[type]??0),0);
  let roll=rng.next()*total;
  for(const type of available){roll-=ITEM_TYPE_WEIGHTS[type]??0;if(roll<0)return type;}
  return available.at(-1);
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
  const types = options.type ? [options.type] : options.types ?? Object.keys(ITEM_NAMES);
  const type = options.type ? types[0] : chooseType(rng,types);
  const names = ITEM_NAMES[type];
  if (!names) throw new RangeError(`Unknown item type: ${type}`);
  const baseName=rng.pick(names);
  const name = `${rarity.label} ${rng.pick(PREFIXES)} ${baseName}`;
  const stackable = ["tonic","food","scroll","key","gem","herb","material"].includes(type);
  const item = {
    id: `drop-${rng.nextUint32().toString(16).padStart(8, "0")}`,
    name,
    type,
    slot: SLOT_BY_TYPE[type]??type,
    spriteCategory:spriteCategory(type,baseName),
    material:["weapon","shield","gloves","armor","helmet","boots"].includes(type)?MATERIAL_BY_RARITY[rarity.id]:undefined,
    rarity: rarity.id,
    color: rarity.color,
    rarityGlow: rarity.glow,
    floor,
    value: Math.max(2, Math.floor(5 * rarity.multiplier * (1 + (floor - 1) * 0.25))),
    stackable,
    quantity: 1,
    stackType: ["material","scroll","key","gem","herb"].includes(type) ? baseName : type,
    materialId: ["material","scroll","key","gem","herb"].includes(type) ? baseName : undefined,
    experience:0,
    attack: 0, defense: 0, maxHp: 0, crit: 0, speed: 0, vision: 0, lifeSteal: 0, thorns: 0, reach: 0,
    heal: 0,
  };
  if (stackable) {
    if (type === "tonic") item.heal = Math.max(8, Math.round(12 * rarity.multiplier * (1 + (floor - 1) * 0.15)));
    else if(type==="food")item.heal=Math.max(4,Math.round(6*rarity.multiplier*(1+(floor-1)*.1)));
    else if(type==="scroll")item.experience=Math.max(4,Math.round(6*rarity.multiplier*(1+(floor-1)*.15)));
    return item;
  }
  for (const stat of sampleAttributes(rng, type, rarity)) item[stat] = statValue(stat, floor, rarity.multiplier);
  return item;
}
