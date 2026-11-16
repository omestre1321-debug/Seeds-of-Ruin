export const CLASSES = Object.freeze({
  vanguard: Object.freeze({
    id: "vanguard", name: "Vanguard", role: "Front line", description: "A steady guard who survives the first blow.",
    passiveId: "stoneward", passiveName: "Stoneward", passiveDescription: "The first hit you take on each floor is reduced by 3.", passive: Object.freeze({ firstHitReduction: 3 }),
    stats: Object.freeze({ maxHp: 44, attack: 4, defense: 2, crit: 0.04, speed: 0, vision: 0, lifeSteal: 0, thorns: 0, reach: 0 }),
    startingWeapon: Object.freeze({ id: "class-vanguard-cleaver", name: "Cinder Cleaver", type: "weapon", slot: "weapon", visualId: "weapon-starter-cleaver", rarity: "common", color: "#b9c2b8", value: 0, quantity: 1, attack: 2, defense: 0, maxHp: 0, crit: 0, speed: 0, vision: 0, lifeSteal: 0, thorns: 0, reach: 0 }),
  }),
  wayfinder: Object.freeze({
    id: "wayfinder", name: "Wayfinder", role: "Scout", description: "A quick eye and a longer reach through the gloom.",
    passiveId: "far-sight", passiveName: "Far Sight", passiveDescription: "Sees two tiles farther and can strike from one extra tile away.", passive: Object.freeze({}),
    stats: Object.freeze({ maxHp: 35, attack: 4, defense: 0, crit: 0.12, speed: 0.12, vision: 2, lifeSteal: 0, thorns: 0, reach: 1 }),
    startingWeapon: Object.freeze({ id: "class-wayfinder-bow", name: "Cinder Reed Bow", type: "weapon", slot: "weapon", visualId: "weapon-starter-bow", rarity: "common", color: "#b9c2b8", value: 0, quantity: 1, attack: 1, defense: 0, maxHp: 0, crit: 0.02, speed: 0, vision: 0, lifeSteal: 0, thorns: 0, reach: 0 }),
  }),
  emberAdept: Object.freeze({
    id: "emberAdept", name: "Ember Adept", role: "Arcanist", description: "A fragile scholar whose ember magic steals back vitality.",
    passiveId: "soul-siphon", passiveName: "Soul Siphon", passiveDescription: "Every strike restores a little life.", passive: Object.freeze({ lifeSteal: 0.06 }),
    stats: Object.freeze({ maxHp: 32, attack: 5, defense: 0, crit: 0.08, speed: 0, vision: 1, lifeSteal: 0.06, thorns: 0, reach: 0 }),
    startingWeapon: Object.freeze({ id: "class-adept-rod", name: "Furnace Rod", type: "weapon", slot: "weapon", visualId: "weapon-starter-rod", rarity: "common", color: "#b9c2b8", value: 0, quantity: 1, attack: 1, defense: 0, maxHp: 0, crit: 0.02, speed: 0, vision: 0, lifeSteal: 0, thorns: 0, reach: 0 }),
  }),
});

export const CLASS_LIST=Object.freeze(Object.values(CLASSES));
export const DEFAULT_CLASS_ID="vanguard";
