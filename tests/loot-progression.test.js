import test from "node:test";
import assert from "node:assert/strict";
import { addToInventory, createLoot, consumeTonic, equipItem, equipmentBonuses } from "../js/core/loot.js";
import { recordRun, sanitizeProfile, selectMutator } from "../js/core/progression.js";
import { Rng } from "../js/core/rng.js";

test("loot generation repeats from the same RNG seed and has valid stat shapes", () => {
  const first = createLoot(new Rng("loot-test"), 3);
  const second = createLoot(new Rng("loot-test"), 3);
  assert.deepEqual(first, second);
  assert.ok(first.id.startsWith("drop-"));
  assert.ok(["common", "uncommon", "rare", "epic"].includes(first.rarity));
  assert.ok(first.value > 0);
  assert.ok(first.attack >= 0 && first.defense >= 0 && first.crit >= 0);
});

test("equipment, capacity, and tonic consumption are server-independent core rules", () => {
  const player = { hp: 5, maxHp: 20, inventory: [], equipment: { weapon: null, armor: null, charm: null } };
  const blade = { id: "blade", name: "Blade", slot: "weapon", attack: 3, defense: 0, crit: 0 };
  const tonic = { id: "tonic", name: "Tonic", slot: "consumable", attack: 0, defense: 0, crit: 0, heal: 9 };
  assert.deepEqual(addToInventory(player, blade, 2), { ok: true });
  assert.deepEqual(addToInventory(player, tonic, 2), { ok: true });
  assert.equal(addToInventory(player, { id: "third" }, 2).reason, "full");
  assert.equal(equipItem(player, "blade"), true);
  assert.equal(equipmentBonuses(player).attack, 3);
  assert.deepEqual(consumeTonic(player, "tonic"), { ok: true, healed: 9 });
  assert.equal(player.hp, 14);
  assert.equal(player.inventory.some((item) => item.id === "tonic"), false);
});

test("profile migration clamps invalid values and unlocks long-term mutators", () => {
  const clean = sanitizeProfile({ runs: -3, wins: "bad", bestScore: 50, unlockedMutators: ["none", "bad"] });
  assert.equal(clean.runs, 0);
  assert.equal(clean.wins, 0);
  assert.deepEqual(clean.unlockedMutators, ["none"]);
  let next = clean;
  for (let run=0;run<3;run+=1) next = recordRun(next, { status: "gameover", score: 600, floor: 3 });
  assert.ok(next.unlockedMutators.includes("glass"));
  assert.ok(next.unlockedMutators.includes("deepPockets"));
  assert.equal(selectMutator(next, "deepPockets").ok, true);
  assert.equal(selectMutator(next, "not-real").ok, false);
});
