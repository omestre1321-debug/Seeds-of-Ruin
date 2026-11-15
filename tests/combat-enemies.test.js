import test from "node:test";
import assert from "node:assert/strict";
import { resolveAttack } from "../js/core/combat.js";
import { chooseEnemyAction, createEnemy, ENEMY_TYPES } from "../js/core/enemies.js";
import { generateDungeon } from "../js/core/map/bsp.js";
import { Rng } from "../js/core/rng.js";

test("combat applies defense, minimum damage, and a reproducible critical result", () => {
  const attacker = { name: "Delver", attack: 8, crit: 1 };
  const defender = { name: "Sentry", hp: 40, defense: 3 };
  const result = resolveAttack(attacker, defender, new Rng("combat"));
  assert.equal(result.critical, true);
  assert.ok(result.damage >= 10);
  assert.equal(defender.hp, 40 - result.damage);
  const armored = { hp: 10, defense: 100 };
  const minimum = resolveAttack({ attack: 0, crit: 0 }, armored, new Rng("minimum"));
  assert.equal(minimum.damage, 1);
});

test("wolves pursue using A* and adjacent enemies choose an attack", () => {
  const map = generateDungeon("ai-pursuit");
  const start = map.start;
  const enemyPos = map.rooms.find((room) => Math.abs(room.center.x - start.x) + Math.abs(room.center.y - start.y) > 4)?.center;
  assert.ok(enemyPos);
  const enemy = createEnemy(ENEMY_TYPES.WOLF, "wolf", enemyPos, 1);
  const state = { map, player: { x: start.x, y: start.y }, enemies: [enemy] };
  const action = chooseEnemyAction(state, enemy, new Rng("wolf-turn"));
  assert.equal(action.type, "move");
  const before = Math.abs(enemy.x - start.x) + Math.abs(enemy.y - start.y);
  const after = Math.abs(action.x - start.x) + Math.abs(action.y - start.y);
  assert.ok(after < before);

  enemy.x = start.x + 1; enemy.y = start.y;
  assert.equal(chooseEnemyAction({ ...state, player: start }, enemy, new Rng(1)).type, "attack");
});

test("low-health wraith flees to a safer neighboring tile", () => {
  const map = generateDungeon("ai-flee");
  const center = map.rooms[0].center;
  const enemy = createEnemy(ENEMY_TYPES.WRAITH, "wraith", { x: center.x + 2, y: center.y }, 1, map.rooms[0]);
  enemy.hp = 1;
  const state = { map, player: center, enemies: [enemy] };
  const action = chooseEnemyAction(state, enemy, new Rng("flee"));
  assert.equal(action.type, "move");
  assert.equal(action.behavior, "flee");
  assert.ok(Math.abs(action.x - center.x) + Math.abs(action.y - center.y) > Math.abs(enemy.x - center.x) + Math.abs(enemy.y - center.y));
});
