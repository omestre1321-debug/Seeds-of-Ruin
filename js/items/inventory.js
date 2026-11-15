export const INVENTORY_CAPACITY = 20;

export function isStackable(item) {
  return item?.stackable === true || item?.slot === "consumable" || item?.slot === "material";
}

export function stackKey(item) {
  if (!isStackable(item)) return null;
  if (item.slot === "material") return `material:${item.materialId ?? item.name}:${item.rarity ?? "common"}`;
  return `${item.type}:${item.rarity}:${item.heal ?? 0}:${item.effectId ?? ""}`;
}

export function addToInventory(player, item, capacity = INVENTORY_CAPACITY) {
  if (!Array.isArray(player.inventory)) player.inventory = [];
  const amount = Math.max(1, Math.floor(item.quantity ?? 1));
  const key = stackKey(item);
  if (key) {
    const stack = player.inventory.find((entry) => stackKey(entry) === key);
    if (stack) {
      stack.quantity = Math.max(1, Math.floor(stack.quantity ?? 1)) + amount;
      return { ok: true, stacked: true, item: stack, amount };
    }
  }
  if (player.inventory.length >= capacity) return { ok: false, reason: "full" };
  if (player.inventory.some((entry) => entry.id === item.id)) return { ok: false, reason: "duplicate" };
  const copy = { ...item, quantity: key ? amount : 1 };
  player.inventory.push(copy);
  return { ok: true, stacked: false, item: copy, amount };
}

/** Remove up to `amount` units and return an independent item value for a floor drop. */
export function removeFromInventory(player, itemId, amount = 1) {
  const index = player.inventory?.findIndex((entry) => entry.id === itemId) ?? -1;
  if (index < 0) return { ok: false, reason: "missing" };
  const source = player.inventory[index];
  const quantity = Math.max(1, Math.floor(source.quantity ?? 1));
  const removed = isStackable(source) ? Math.min(quantity, Math.max(1, Math.floor(amount))) : 1;
  const drop = { ...source, id: `${source.id}-drop-${quantity - removed}`, quantity: removed };
  if (removed >= quantity) player.inventory.splice(index, 1);
  else source.quantity = quantity - removed;
  return { ok: true, item: drop, remaining: quantity - removed };
}

export function inventoryCount(player) {
  return Array.isArray(player.inventory) ? player.inventory.length : 0;
}
