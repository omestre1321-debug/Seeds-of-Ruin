import { addToInventory, removeFromInventory, INVENTORY_CAPACITY } from "./inventory.js";
import { getRarity } from "./rarity.js";

export function makeItemDrop(item, x, y, source = "enemy", stableId) {
  const entityId=stableId??`floor-drop:${source}:${item.id}:${x},${y}`;
  return {entityId,id:entityId,version:1,kind:"item",item:{...item},x,y,position:{x,y},source,ownerId:null,collected:false,blockedNotified:false};
}

export function createEnemyItemDrop(enemy, rng, createLoot, floor) {
  if (enemy.type !== "vault-warden" && !rng.chance(0.32)) return null;
  return createLoot(rng, floor, enemy.type === "vault-warden" ? { rarity: "rare" } : {});
}

/** Gold is deliberately a direct counter reward, never an inventory object. */
export function collectDropsAt(drops, player, x, y, capacity = INVENTORY_CAPACITY) {
  const collected = [];
  const messages = [];
  for (const drop of drops) {
    if (drop.collected || drop.x !== x || drop.y !== y) continue;
    if (drop.kind === "currency") {
      const amount = Math.max(0, Math.floor(drop.amount ?? 0));
      player.gold += amount;
      drop.collected = true;
      collected.push(drop);
      messages.push(`Você pegou ${amount} moedas.`);
      continue;
    }
    const result = addToInventory(player, drop.item, capacity);
    if (!result.ok) {
      if (!drop.blockedNotified) messages.push(`Inventário cheio; ${drop.item.name} continua no chão.`);
      drop.blockedNotified = true;
      continue;
    }
    drop.collected = true;
    collected.push(drop);
    const rarity = getRarity(drop.item.rarity).labelPt;
    messages.push(`Você pegou ${drop.item.name} (${rarity}).`);
  }
  return { collected, messages };
}

export function discardInventoryItem(player, itemId, x, y, drops, stableId) {
  const removed = removeFromInventory(player, itemId, 1);
  if (!removed.ok) return removed;
  const drop = makeItemDrop(removed.item, x, y, "discarded", stableId);
  drops.push(drop);
  return { ok: true, drop, item: removed.item };
}
