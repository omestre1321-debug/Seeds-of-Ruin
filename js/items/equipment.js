import { addToInventory, inventoryCount, removeFromInventory, INVENTORY_CAPACITY } from "./inventory.js";

export const EQUIPMENT_SLOTS = Object.freeze([
  { id: "weapon", label: "Weapon", accepts: "weapon" },
  { id: "armor", label: "Armor", accepts: "armor" },
  { id: "helmet", label: "Helmet", accepts: "helmet" },
  { id: "boots", label: "Boots", accepts: "boots" },
  { id: "ring1", label: "Ring I", accepts: "ring" },
  { id: "ring2", label: "Ring II", accepts: "ring" },
  { id: "amulet", label: "Amulet", accepts: "amulet" },
]);

export const EQUIPMENT_STATS = Object.freeze(["attack", "defense", "maxHp", "crit", "speed", "vision", "lifeSteal", "thorns", "reach"]);

function ensureSlots(player) {
  if (!player.equipment || typeof player.equipment !== "object") player.equipment = {};
  for (const slot of EQUIPMENT_SLOTS) if (!(slot.id in player.equipment)) player.equipment[slot.id] = null;
}

export function resolveEquipmentSlot(item, requestedSlot, equipment = {}) {
  const valid = EQUIPMENT_SLOTS.filter((slot) => slot.accepts === item?.slot);
  if (valid.length === 0) return null;
  if (requestedSlot && valid.some((slot) => slot.id === requestedSlot)) return requestedSlot;
  const empty = valid.find((slot) => !equipment[slot.id]);
  return empty?.id ?? valid[0].id;
}

/**
 * Equipped gear lives in the equipment object, not in the pack. To preserve an old
 * item on swap, reserve its return slot before removing the candidate; a full pack
 * blocks the swap and leaves both inventory and equipment unchanged.
 */
export function equipItem(player, itemId, requestedSlot, capacity = INVENTORY_CAPACITY) {
  ensureSlots(player);
  const candidate = player.inventory?.find((entry) => entry.id === itemId);
  if (!candidate) return { ok: false, reason: "missing" };
  if (["consumable", "material"].includes(candidate.slot)) return { ok: false, reason: "not-equipment" };
  const slot = resolveEquipmentSlot(candidate, requestedSlot, player.equipment);
  if (!slot) return { ok: false, reason: "invalid-slot" };
  const previous = player.equipment[slot];
  if (previous && inventoryCount(player) >= capacity) return { ok: false, reason: "inventory-full-for-swap", slot };

  if (previous) {
    const returned = addToInventory(player, previous, capacity);
    if (!returned.ok) return { ok: false, reason: "inventory-full-for-swap", slot };
  }
  const incoming = { ...candidate, quantity: 1 };
  const removed = removeFromInventory(player, itemId, 1);
  if (!removed.ok) {
    if (previous) removeFromInventory(player, previous.id, 1);
    return { ok: false, reason: "missing", slot };
  }
  player.equipment[slot] = incoming;
  return { ok: true, slot, previous: previous ?? null, equipped: incoming };
}

export function removeEquippedItem(player,slotId){
  ensureSlots(player);
  if(!EQUIPMENT_SLOTS.some((entry)=>entry.id===slotId)||!player.equipment[slotId])return {ok:false,reason:"empty-slot"};
  const item=player.equipment[slotId];player.equipment[slotId]=null;
  return {ok:true,item,slot:slotId};
}

export function unequipItem(player, slotId, capacity = INVENTORY_CAPACITY) {
  ensureSlots(player);
  const slot = EQUIPMENT_SLOTS.find((entry) => entry.id === slotId);
  if (!slot || !player.equipment[slotId]) return { ok: false, reason: "empty-slot" };
  if (inventoryCount(player) >= capacity) return { ok: false, reason: "inventory-full" };
  const item = player.equipment[slotId];
  const added = addToInventory(player, item, capacity);
  if (!added.ok) return { ok: false, reason: "inventory-full" };
  player.equipment[slotId] = null;
  return { ok: true, item, slot: slotId };
}

export function equipmentBonuses(player) {
  const totals = Object.fromEntries(EQUIPMENT_STATS.map((stat) => [stat, 0]));
  for (const item of Object.values(player.equipment ?? {})) {
    if (!item) continue;
    for (const stat of EQUIPMENT_STATS) totals[stat] += Number(item[stat] ?? 0);
  }
  totals.crit = Math.min(0.5, totals.crit);
  totals.lifeSteal = Math.min(0.5, totals.lifeSteal);
  return totals;
}

export function compareWithEquipped(player, item, slotId) {
  const slot = resolveEquipmentSlot(item, slotId, player.equipment ?? {});
  if (!slot) return { slot: null, current: null, changes: [] };
  const current = player.equipment?.[slot] ?? null;
  const changes = EQUIPMENT_STATS.filter((stat) => Number(item[stat] ?? 0) !== Number(current?.[stat] ?? 0)).map((stat) => ({
    stat,
    candidate: Number(item[stat] ?? 0),
    current: Number(current?.[stat] ?? 0),
    delta: Number(item[stat] ?? 0) - Number(current?.[stat] ?? 0),
  }));
  return { slot, current, changes };
}
