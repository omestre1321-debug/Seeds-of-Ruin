import { findPath } from "./pathfinding.js";
import { isWalkable } from "./map/flood-fill.js";

export const ENEMY_TYPES = Object.freeze({
  SENTRY: "ashen-sentry",
  WOLF: "ember-wolf",
  WRAITH: "mourning-wraith",
  BOSS: "vault-warden",
});

const BASE_STATS = Object.freeze({
  [ENEMY_TYPES.SENTRY]: { name: "Ashen Sentry", hp: 10, attack: 3, defense: 0, crit: 0.03, xp: 8, gold: 3 },
  [ENEMY_TYPES.WOLF]: { name: "Cinder Wolf", hp: 8, attack: 3, defense: 0, crit: 0.08, xp: 10, gold: 4 },
  [ENEMY_TYPES.WRAITH]: { name: "Mourning Wraith", hp: 7, attack: 3, defense: 0, crit: 0.06, xp: 11, gold: 5 },
  [ENEMY_TYPES.BOSS]: { name: "The Vault Warden", hp: 22, attack: 5, defense: 1, crit: 0.08, xp: 55, gold: 30 }
});

export function createEnemy(type, id, position, floor, room = null) {
  const base = BASE_STATS[type];
  if (!base) throw new RangeError(`Unknown enemy type: ${type}`);
  const boss = type === ENEMY_TYPES.BOSS;
  const scaling = Math.max(0, floor - 1);
  const maxHp = base.hp + scaling * (boss ? 6 : 2);
  return {
    id,
    type,
    name: base.name,
    x: position.x,
    y: position.y,
    hp: maxHp,
    maxHp,
    attack: base.attack + scaling,
    defense: base.defense + (boss ? Math.floor(scaling / 3) : 0),
    crit: Math.min(0.3, base.crit + scaling * 0.01),
    xp: base.xp + scaling * 3,
    gold: base.gold + scaling * 2,
    home: room ? { x: room.x, y: room.y, width: room.width, height: room.height } : null,
    patrolIndex: 0,
    alive: true,
  };
}

function occupiedByOther(state, x, y, enemy) {
  if (state.player.x === x && state.player.y === y) return true;
  return state.enemies.some((other) => other.alive && other.id !== enemy.id && other.x === x && other.y === y);
}

function nextPathStep(state, enemy) {
  const path = findPath(state.map, { x: enemy.x, y: enemy.y }, { x: state.player.x, y: state.player.y });
  if (path.length > 1) {
    const next = path[1];
    if (!occupiedByOther(state, next.x, next.y, enemy)) return { type: "move", x: next.x, y: next.y };
  }
  return { type: "wait" };
}

function neighborCells(state, enemy) {
  const candidates = [
    { x: enemy.x, y: enemy.y - 1 },
    { x: enemy.x + 1, y: enemy.y },
    { x: enemy.x, y: enemy.y + 1 },
    { x: enemy.x - 1, y: enemy.y },
  ];
  return candidates.filter((cell) => isWalkable(state.map, cell.x, cell.y) && !occupiedByOther(state, cell.x, cell.y, enemy));
}

/** Decide one enemy turn without DOM or mutation; caller applies the returned intent. */
export function chooseEnemyAction(state, enemy, rng) {
  const distance = Math.abs(enemy.x - state.player.x) + Math.abs(enemy.y - state.player.y);
  if (distance === 1) return { type: "attack" };

  if (enemy.type === ENEMY_TYPES.WRAITH && enemy.hp <= enemy.maxHp * 0.45 && distance <= 5) {
    const safe = neighborCells(state, enemy);
    if (safe.length > 0) {
      safe.sort((a, b) => (Math.abs(b.x - state.player.x) + Math.abs(b.y - state.player.y)) - (Math.abs(a.x - state.player.x) + Math.abs(a.y - state.player.y)) || a.y - b.y || a.x - b.x);
      const bestDistance = Math.abs(safe[0].x - state.player.x) + Math.abs(safe[0].y - state.player.y);
      const best = safe.filter((cell) => Math.abs(cell.x - state.player.x) + Math.abs(cell.y - state.player.y) === bestDistance);
      const choice = rng.pick(best);
      return { type: "move", x: choice.x, y: choice.y, behavior: "flee" };
    }
  }

  const aggroRange = enemy.type === ENEMY_TYPES.BOSS ? Infinity : enemy.type === ENEMY_TYPES.WOLF ? 10 : 6;
  if (distance <= aggroRange) return nextPathStep(state, enemy);

  // Sentries and distant creatures pace only inside their home room.
  const home = enemy.home;
  const patrol = neighborCells(state, enemy).filter((cell) => !home || (
    cell.x >= home.x && cell.x < home.x + home.width && cell.y >= home.y && cell.y < home.y + home.height
  ));
  if (patrol.length === 0 || rng.chance(0.25)) return { type: "wait" };
  const step = rng.pick(patrol);
  return { type: "move", x: step.x, y: step.y, behavior: "patrol" };
}
