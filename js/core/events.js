export const EVENT_DEFINITIONS = Object.freeze({
  shrine: {
    title: "The Ember Shrine",
    description: "A coal-red flame offers warmth at a price.",
    choices: [
      { id: "offer-gold", label: "Offer 8 gold · restore 12 HP" },
      { id: "take-flame", label: "Take the flame · +2 attack, -4 max HP" },
    ],
  },
  mirror: {
    title: "The Soot Mirror",
    description: "Your reflection reaches toward the other side of the glass.",
    choices: [
      { id: "break-mirror", label: "Break it · gain 15 gold" },
      { id: "touch-mirror", label: "Touch it · +1 critical chance, lose 6 HP" },
    ],
  },
  cairn: {
    title: "The Unmarked Cairn",
    description: "Someone left a field ration beside a pile of name-less stones.",
    choices: [
      { id: "take-ration", label: "Take the ration · restore 8 HP" },
      { id: "leave-offering", label: "Leave 5 gold · gain 10 score" },
    ],
  },
});

export function createEvent(rng, floor) {
  const type = rng.pick(Object.keys(EVENT_DEFINITIONS));
  const definition = EVENT_DEFINITIONS[type];
  return { type, floor, title: definition.title, description: definition.description, choices: definition.choices.map((choice) => ({ ...choice })) };
}

/** Apply a player-confirmed choice; return a descriptive result without touching UI. */
export function resolveEventChoice(player, event, choiceId) {
  const choice = event.choices.find((entry) => entry.id === choiceId);
  if (!choice) return { ok: false, reason: "unknown-choice" };
  switch (`${event.type}:${choiceId}`) {
    case "shrine:offer-gold":
      if (player.gold < 8) return { ok: false, reason: "not-enough-gold" };
      player.gold -= 8;
      player.hp = Math.min(player.maxHp, player.hp + 12);
      return { ok: true, text: "The shrine warms your hands. You recover 12 HP." };
    case "shrine:take-flame":
      player.baseAttack += 2;
      player.baseMaxHp = Math.max(8, player.baseMaxHp - 4);
      player.maxHp = Math.max(8, player.maxHp - 4);
      player.hp = Math.min(player.hp, player.maxHp);
      return { ok: true, text: "The flame settles in your blade. Your vitality thins." };
    case "mirror:break-mirror":
      player.gold += 15;
      return { ok: true, text: "The mirror breaks. A cache of 15 gold spills out." };
    case "mirror:touch-mirror":
      player.baseCrit = Math.min(0.7, player.baseCrit + 0.1);
      player.hp = Math.max(1, player.hp - 6);
      return { ok: true, text: "The glass burns. Your next strike finds a sharper path." };
    case "cairn:take-ration":
      player.hp = Math.min(player.maxHp, player.hp + 8);
      return { ok: true, text: "You take the ration and recover up to 8 HP." };
    case "cairn:leave-offering":
      if (player.gold < 5) return { ok: false, reason: "not-enough-gold" };
      player.gold -= 5;
      player.bonusScore = (player.bonusScore ?? 0) + 10;
      return { ok: true, text: "You leave 5 gold. The stones remember your name." };
    default:
      return { ok: false, reason: "unsupported-choice" };
  }
}
