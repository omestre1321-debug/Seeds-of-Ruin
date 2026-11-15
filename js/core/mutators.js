export const MUTATORS = Object.freeze({
  none: { id: "none", name: "No Mutator", description: "The vault as it was written." },
  glass: { id: "glass", name: "Glass Oath", description: "Less vitality, heavier blows.", maxHpMultiplier: 0.72, attackBonus: 2 },
  deepPockets: { id: "deepPockets", name: "Deep Pockets", description: "Begin with 25 extra gold.", startingGold: 25 },
  ironEcho: { id: "ironEcho", name: "Iron Echo", description: "Your guard hardens; the vault answers in kind.", defenseBonus: 1, enemyHpMultiplier: 1.18 },
});

export function getMutator(id) {
  return MUTATORS[id] ?? MUTATORS.none;
}

export function applyEnemyMutator(enemy, mutator) {
  const scale = mutator.enemyHpMultiplier ?? 1;
  if (scale === 1) return enemy;
  const oldMax = enemy.maxHp;
  enemy.maxHp = Math.max(oldMax, Math.ceil(oldMax * scale));
  enemy.hp += enemy.maxHp - oldMax;
  return enemy;
}
