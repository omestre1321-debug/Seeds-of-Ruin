export function combatStats(player) {
  const gear = player.equipmentBonuses ?? { attack: 0, defense: 0, crit: 0 };
  return {
    attack: player.baseAttack + gear.attack,
    defense: player.baseDefense + gear.defense,
    crit: Math.min(0.75, player.baseCrit + gear.crit),
  };
}

/** Resolve one deterministic attack. Mutates only the defender's HP and returns a log-ready record. */
export function resolveAttack(attacker, defender, rng, options = {}) {
  if (!attacker || !defender || defender.hp <= 0) return { hit: false, reason: "invalid-target", damage: 0, critical: false };
  const evasionChance=Math.max(0,Math.min(0.35,Number(defender.speed??0)*0.08));
  if(evasionChance>0&&rng.chance(evasionChance))return {hit:false,evaded:true,reason:"evaded",damage:0,critical:false};
  const critChance = Math.max(0, Math.min(1, options.crit ?? attacker.crit ?? 0));
  const critical = rng.chance(critChance);
  const variation = rng.int(0, 2);
  const attack = Math.max(0, Math.floor(attacker.attack ?? 0)) + variation;
  const raw = critical ? Math.floor(attack * 1.7) : attack;
  const defense = Math.max(0, Math.floor(defender.defense ?? 0));
  const damage = Math.max(1, raw - defense);
  defender.hp = Math.max(0, defender.hp - damage);
  return {
    hit: true,
    damage,
    critical,
    defeated: defender.hp === 0,
    attacker: attacker.name,
    defender: defender.name,
  };
}

export function scoreRun(run) {
  const player = run.player;
  return Math.max(0,
    run.floor * 100 +
    (player.xp ?? 0) * 8 +
    (player.gold ?? 0) * 2 +
    (run.kills ?? 0) * 25 +
    (run.bossDefeated ? 500 : 0) +
    (player.bonusScore ?? 0)
  );
}
