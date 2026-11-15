import { resolveAttack, scoreRun } from "./combat.js";
import { chooseEnemyAction } from "./enemies.js";
import { createEvent, resolveEventChoice } from "./events.js";
import { generateFloor } from "./map/floor.js";
import { computeFov, mergeExplored } from "./fov.js";
import { TILE } from "./map/tiles.js";
import { Rng } from "./rng.js";
import { createLoot } from "./loot.js";
import { addToInventory, consumeTonic, INVENTORY_CAPACITY } from "../items/inventory.js";
import { collectDropsAt, createEnemyItemDrop, discardInventoryItem, makeItemDrop } from "../items/drops.js";
import { equipItem, equipmentBonuses, unequipItem } from "../items/equipment.js";
import { getMutator } from "./mutators.js";
import { sanitizeProfile } from "./progression.js";

const MAX_LOG = 90;
const FOV_RADIUS = 8;

function updateVisibility(state, resetExploration = false) {
  state.visible = computeFov(state.map, state.player, Math.max(4, Math.min(14, FOV_RADIUS + (state.player.vision ?? 0))));
  state.explored = resetExploration || !state.explored || state.explored.length !== state.visible.length
    ? new Uint8Array(state.visible)
    : mergeExplored(state.explored, state.visible);
}

function pushLog(state, text, type = "info") {
  state.log.push({ turn: state.turn, text, type });
  if (state.log.length > MAX_LOG) state.log.splice(0, state.log.length - MAX_LOG);
}

function recalculatePlayer(player) {
  player.equipmentBonuses = equipmentBonuses(player);
  player.maxHp=Math.max(1,Math.floor(player.baseMaxHp*(player.maxHpMultiplier??1))+player.equipmentBonuses.maxHp);
  player.hp=Math.min(player.hp,player.maxHp);
  player.attack=player.baseAttack+player.mutatorAttack+player.equipmentBonuses.attack;
  player.defense=player.baseDefense+player.mutatorDefense+player.equipmentBonuses.defense;
  player.crit=Math.min(0.75,player.baseCrit+player.equipmentBonuses.crit);
  player.speed=player.baseSpeed+player.equipmentBonuses.speed;
  player.vision=Math.max(0,player.equipmentBonuses.vision);
  player.lifeSteal=player.equipmentBonuses.lifeSteal;
  player.thorns=player.equipmentBonuses.thorns;
  player.reach=player.equipmentBonuses.reach;
}

function starterItem() {
  return {
    id: "starter-ash-knife",
    name: "Common Ash Knife",
    type: "weapon",
    slot: "weapon",
    rarity: "common",
    color: "#aeb8ad",
    floor: 1,
    value: 0,
    attack: 2, defense: 0, maxHp: 0, crit: 0, speed: 0, vision: 0, lifeSteal: 0, thorns: 0, reach: 0,
    quantity: 1,
  };
}

export function createGame(seed, profileValue = {}, options = {}) {
  const profile = sanitizeProfile(profileValue);
  const maxFloors = Math.max(2, Math.min(12, Math.floor(options.maxFloors ?? 4)));
  const mutator = getMutator(options.mutator ?? profile.selectedMutator);
  const baseMaxHp = 38;
  const maxHp = Math.max(12, Math.floor(baseMaxHp * (mutator.maxHpMultiplier ?? 1)));
  const player = {
    name: "The Delver",
    x: 0,
    y: 0,
    hp: maxHp,
    maxHp,
    baseMaxHp,
    baseAttack: 4,
    baseDefense: 1,
    baseCrit: 0.06,
    baseSpeed: 0,
    mutatorAttack: mutator.attackBonus ?? 0,
    mutatorDefense: mutator.defenseBonus ?? 0,
    maxHpMultiplier: mutator.maxHpMultiplier ?? 1,
    attack: 0,
    defense: 0,
    crit: 0,
    level: 1,
    xp: 0,
    gold: mutator.startingGold ?? 8,
    inventory: [{ id: "starter-tonic", name: "Common Warmth Tonic", type: "tonic", slot: "consumable", rarity: "common", color: "#b9c2b8", floor: 1, value: 0, stackable: true, quantity: 1, attack: 0, defense: 0, maxHp: 0, crit: 0, speed: 0, vision: 0, lifeSteal: 0, thorns: 0, reach: 0, heal: 12 }],
    equipment: { weapon: starterItem(), armor: null, helmet: null, boots: null, ring1: null, ring2: null, amulet: null },
    bonusScore: 0,
  };
  recalculatePlayer(player);
  const currentFloor = generateFloor(seed, 1, maxFloors, { mutator });
  player.x = currentFloor.map.start.x;
  player.y = currentFloor.map.start.y;
  const rng = new Rng(`${String(seed)}::run`);
  const state = {
    seed: String(seed ?? 0),
    rng,
    profile,
    mutator,
    maxFloors,
    floor: 1,
    turn: 0,
    status: "playing",
    map: currentFloor.map,
    features: currentFloor.features,
    enemies: currentFloor.enemies,
    drops: [],
    player,
    kills: 0,
    bossDefeated: false,
    score: 0,
    overlay: null,
    log: [],
  };
  updateVisibility(state, true);
  pushLog(state, `You enter the Cinder Vault. Seed: ${state.seed}.`, "system");
  if (mutator.id !== "none") pushLog(state, `Mutator: ${mutator.name}. ${mutator.description}`, "system");
  return state;
}

function setTerminalStatus(state, status) {
  state.status = status;
  state.score = scoreRun({ ...state, player: state.player });
}

function featureAt(state, x, y) {
  return state.features.find((feature) => !feature.used && feature.x === x && feature.y === y);
}

function playerCombatSnapshot(player) {
  return { name: "You", attack: player.attack, defense: player.defense, crit: player.crit, speed: player.speed };
}

function collectAtPlayer(state) {
  const result=collectDropsAt(state.drops,state.player,state.player.x,state.player.y);
  for(const message of result.messages) pushLog(state,message,message.startsWith("Inventário cheio")?"warning":"loot");
  return result;
}

function gainExperience(state, amount) {
  const player = state.player;
  player.xp += amount;
  let threshold = player.level * 18;
  while (player.xp >= threshold) {
    player.xp -= threshold;
    player.level += 1;
    player.baseMaxHp += 3;
    player.baseAttack += 1;
    recalculatePlayer(player);
    player.hp = Math.min(player.maxHp, player.hp + 8);
    pushLog(state, `Level ${player.level}! Your max HP and attack increase.`, "good");
    threshold = player.level * 18;
  }
}

function defeatEnemy(state, enemy) {
  enemy.alive = false;
  state.kills += 1;
  state.player.gold += enemy.gold;
  gainExperience(state, enemy.xp);
  pushLog(state, `${enemy.name} falls. +${enemy.gold} gold, +${enemy.xp} XP.`, "good");
  const item = createEnemyItemDrop(enemy, state.rng, createLoot, state.floor);
  if (item && enemy.type === "vault-warden") {
    const added = addToInventory(state.player, item, INVENTORY_CAPACITY);
    if (!added.ok) state.player.gold += item.value;
    pushLog(state, added.ok ? `The Warden yields ${item.name}.` : `The Warden's relic is sold for ${item.value} gold; your pack is full.`, "loot");
  } else if (item) {
    state.drops.push(makeItemDrop(item, enemy.x, enemy.y, "enemy"));
    pushLog(state, `${item.name} falls to the floor.`, "loot");
  }
  if (enemy.type === "vault-warden") {
    state.bossDefeated = true;
    setTerminalStatus(state, "victory");
    pushLog(state, "The Vault Warden is broken. You escape the deep alive.", "victory");
  }
}

function playerAttack(state, enemy) {
  const result = resolveAttack(playerCombatSnapshot(state.player), enemy, state.rng);
  if(result.evaded){pushLog(state,`${enemy.name} evades your strike.`,"warning");return result;}
  pushLog(state, `${result.critical ? "Critical! " : ""}You strike ${enemy.name} for ${result.damage}.`, result.critical ? "critical" : "combat");
  if(state.player.lifeSteal>0&&result.damage>0){const healed=Math.min(state.player.maxHp-state.player.hp,Math.floor(result.damage*state.player.lifeSteal));if(healed>0){state.player.hp+=healed;pushLog(state,`Life steal restores ${healed} HP.`,"good");}}
  if (result.defeated) defeatEnemy(state, enemy);
  return result;
}

function enemyAttack(state, enemy) {
  const result = resolveAttack(enemy, state.player, state.rng);
  if(result.evaded){pushLog(state,`You evade ${enemy.name}'s strike.`,"good");return;}
  pushLog(state, `${result.critical ? "Critical! " : ""}${enemy.name} hits you for ${result.damage}.`, "danger");
  if(state.player.thorns>0&&enemy.alive){enemy.hp=Math.max(0,enemy.hp-state.player.thorns);pushLog(state,`Thorns deal ${state.player.thorns} damage to ${enemy.name}.`,"combat");if(enemy.hp===0)defeatEnemy(state,enemy);}
  if (state.player.hp <= 0) {
    setTerminalStatus(state, "gameover");
    pushLog(state, "You fall. The vault keeps what it was owed.", "death");
  }
}

function enemyTurn(state) {
  const living = state.enemies.filter((enemy) => enemy.alive).sort((a, b) => a.id.localeCompare(b.id));
  for (const enemy of living) {
    if (state.status !== "playing" || state.overlay) break;
    const action = chooseEnemyAction(state, enemy, state.rng);
    if (action.type === "attack") enemyAttack(state, enemy);
    else if (action.type === "move") {
      enemy.x = action.x;
      enemy.y = action.y;
      if (action.behavior === "flee") pushLog(state, `${enemy.name} retreats into the dark.`, "warning");
    }
  }
}

function openShop(state, feature) {
  feature.visited = true;
  if (!feature.stock) {
    const stockRng = new Rng(`${state.seed}::shop::${state.floor}::${feature.id}`);
    feature.stock = Array.from({ length: 3 }, () => {
      const item = createLoot(stockRng, state.floor);
      return { item, cost: Math.max(5, item.value + state.floor * 2) };
    });
  }
  state.overlay = { type: "shop", featureId: feature.id, stock: feature.stock };
  pushLog(state, "The trader waits by a low, blue flame.", "system");
}

function interact(state) {
  const feature = featureAt(state, state.player.x, state.player.y);
  if (feature) {
    if (feature.type === "shop") { openShop(state, feature); return { ok: true, consumedTurn: false }; }
    if (feature.type === "event") {
      state.overlay = { type: "event", featureId: feature.id, event: createEvent(state.rng, state.floor) };
      pushLog(state, "Something stirs in the stone. Choose carefully.", "system");
      return { ok: true, consumedTurn: false };
    }
    if (feature.type === "treasure") {
      feature.used = true;
      state.player.gold += feature.gold;
      const item = createLoot(state.rng, state.floor, feature.guaranteedTonic ? { type: "tonic" } : {});
      state.drops.push(makeItemDrop(item,state.player.x,state.player.y,"chest"));
      pushLog(state, `The cache yields ${feature.gold} gold.`, "loot");
      collectAtPlayer(state);
      return { ok: true, consumedTurn: true };
    }
  }

  if (state.player.x === state.map.stairs.x && state.player.y === state.map.stairs.y) {
    if (state.floor === state.maxFloors) {
      return { ok: false, consumedTurn: false, reason: "The Warden still holds the stair." };
    }
    descend(state);
    return { ok: true, consumedTurn: false };
  }

  const pickup=collectAtPlayer(state);
  if(pickup.collected.length>0)return {ok:true,consumedTurn:false};
  if(state.drops.some((drop)=>!drop.collected&&drop.x===state.player.x&&drop.y===state.player.y))return {ok:false,consumedTurn:false,reason:"Inventory full; the item remains underfoot."};
  return { ok: false, consumedTurn: false, reason: "Nothing here answers." };
}

function descend(state) {
  state.floor += 1;
  const next = generateFloor(state.seed, state.floor, state.maxFloors, { mutator: state.mutator });
  state.map = next.map;
  state.features = next.features;
  state.enemies = next.enemies;
  state.drops = [];
  state.player.x = next.map.start.x;
  state.player.y = next.map.start.y;
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + 7);
  updateVisibility(state, true);
  pushLog(state, `You descend to floor ${state.floor}. The air grows hotter.`, "system");
}

function processEnemyTurnsAfterAction(state, consumedTurn) {
  if (consumedTurn && state.status === "playing" && !state.overlay) {
    state.turn += 1;
    enemyTurn(state);
  }
  updateVisibility(state);
}

export function performAction(state, intent) {
  if (!state || state.status !== "playing") return { ok: false, consumedTurn: false, reason: "run-ended" };
  if (!intent || typeof intent.type !== "string") return { ok: false, consumedTurn: false, reason: "invalid-intent" };

  if (state.overlay) {
    if (intent.type === "close") { state.overlay = null; return { ok: true, consumedTurn: false }; }
    if (state.overlay.type === "shop" && intent.type === "buy") {
      const offer = state.overlay.stock.find((entry) => entry.item.id === intent.itemId);
      if (!offer) return { ok: false, consumedTurn: false, reason: "unknown-item" };
      if (state.player.gold < offer.cost) return { ok: false, consumedTurn: false, reason: "not-enough-gold" };
      const result = addToInventory(state.player, offer.item, INVENTORY_CAPACITY);
      if (!result.ok) return { ok: false, consumedTurn: false, reason: "pack-full" };
      state.player.gold -= offer.cost;
      offer.sold = true;
      pushLog(state, `Bought ${offer.item.name} for ${offer.cost} gold.`, "good");
      return { ok: true, consumedTurn: false };
    }
    if (intent.type === "choose" && state.overlay.type === "event") {
      const result = resolveEventChoice(state.player, state.overlay.event, intent.choiceId);
      if (!result.ok) return { ...result, consumedTurn: false };
      const feature = state.features.find((entry) => entry.id === state.overlay.featureId);
      if (feature) feature.used = true;
      state.overlay = null;
      recalculatePlayer(state.player);
      pushLog(state, result.text, "good");
      processEnemyTurnsAfterAction(state, true);
      return { ok: true, consumedTurn: true };
    }
    if (intent.type === "equip") {
      const result=equipItem(state.player,intent.itemId,intent.slot,INVENTORY_CAPACITY);
      if (!result.ok) return {ok:false,consumedTurn:false,reason:result.reason};
      recalculatePlayer(state.player);
      pushLog(state,`Equipped ${result.equipped.name} in ${result.slot}.`,"good");
      return {ok:true,consumedTurn:false};
    }
    if(intent.type==="unequip"){
      const result=unequipItem(state.player,intent.slot,INVENTORY_CAPACITY);
      if(!result.ok)return {ok:false,consumedTurn:false,reason:result.reason};
      recalculatePlayer(state.player);pushLog(state,`Unequipped ${result.item.name}.`,"good");return {ok:true,consumedTurn:false};
    }
    return { ok: false, consumedTurn: false, reason: "close-the-current-panel-first" };
  }

  let result;
  switch (intent.type) {
    case "move": {
      if (Math.abs(intent.dx) + Math.abs(intent.dy) !== 1) return { ok: false, consumedTurn: false, reason: "move-one-cardinal-tile" };
      const x = state.player.x + intent.dx;
      const y = state.player.y + intent.dy;
      if (x < 0 || y < 0 || x >= state.map.width || y >= state.map.height) return { ok: false, consumedTurn: false, reason: "blocked" };
      const enemy = state.enemies.find((entry) => entry.alive && entry.x === x && entry.y === y);
      if (enemy) {
        playerAttack(state, enemy);
        result = { ok: true, consumedTurn: true };
      } else if (state.map.tiles[y * state.map.width + x] === TILE.WALL) {
        return { ok: false, consumedTurn: false, reason: "blocked" };
      } else {
        state.player.x = x;
        state.player.y = y;
        collectAtPlayer(state);
        result = { ok: true, consumedTurn: true };
      }
      break;
    }
    case "attack": {
      const enemy = state.enemies.find((entry) => entry.alive && entry.id === intent.targetId);
      if (!enemy || Math.abs(enemy.x - state.player.x) + Math.abs(enemy.y - state.player.y) > 1+Math.floor(state.player.reach)) return { ok: false, consumedTurn: false, reason: "target-out-of-reach" };
      playerAttack(state, enemy);
      result = { ok: true, consumedTurn: true };
      break;
    }
    case "wait": result = { ok: true, consumedTurn: true }; break;
    case "abandon":
      setTerminalStatus(state,"gameover");
      pushLog(state,"You leave the descent behind.","death");
      result={ok:true,consumedTurn:false};
      break;
    case "interact": result = interact(state); break;
    case "descend":
      if (state.player.x !== state.map.stairs.x || state.player.y !== state.map.stairs.y) return { ok: false, consumedTurn: false, reason: "not-on-stairs" };
      if (state.floor === state.maxFloors) return { ok: false, consumedTurn: false, reason: "defeat-the-warden-first" };
      descend(state);
      return { ok: true, consumedTurn: false };
    case "equip": {
      const equipped=equipItem(state.player,intent.itemId,intent.slot,INVENTORY_CAPACITY);
      if(!equipped.ok)return {ok:false,consumedTurn:false,reason:equipped.reason};
      recalculatePlayer(state.player);pushLog(state,`Equipped ${equipped.equipped.name} in ${equipped.slot}.`,"good");result={ok:true,consumedTurn:false};break;
    }
    case "unequip": {
      const removed=unequipItem(state.player,intent.slot,INVENTORY_CAPACITY);
      if(!removed.ok)return {ok:false,consumedTurn:false,reason:removed.reason};
      recalculatePlayer(state.player);pushLog(state,`Unequipped ${removed.item.name}.`,"good");result={ok:true,consumedTurn:false};break;
    }
    case "discard": {
      const dropped=discardInventoryItem(state.player,intent.itemId,state.player.x,state.player.y,state.drops);
      if(!dropped.ok)return {ok:false,consumedTurn:false,reason:dropped.reason};
      pushLog(state,`You dropped ${dropped.item.name} on the floor.`,"warning");result={ok:true,consumedTurn:true};break;
    }
    case "use": return useItem(state, intent.itemId);
    default: return { ok: false, consumedTurn: false, reason: "unknown-action" };
  }
  processEnemyTurnsAfterAction(state, result.consumedTurn);
  return result;
}

function useItem(state, itemId) {
  const result = consumeTonic(state.player, itemId);
  if (!result.ok) return { ...result, consumedTurn: false };
  pushLog(state, `You recover ${result.healed} HP.`, "good");
  processEnemyTurnsAfterAction(state, true);
  return { ...result, consumedTurn: true };
}

export function getRunSummary(state) {
  return {
    status: state.status,
    score: state.status === "playing" ? scoreRun(state) : state.score,
    floor: state.floor,
    kills: state.kills,
    seed: state.seed,
    bossDefeated: state.bossDefeated,
  };
}
