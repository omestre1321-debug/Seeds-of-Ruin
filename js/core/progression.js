import { MUTATORS } from "./mutators.js";
import { createCharacter, sanitizeCharacter } from "./character.js";

export const PROFILE_VERSION = 1;
export const DEFAULT_PROFILE = Object.freeze({
  version: PROFILE_VERSION,
  runs: 0,
  wins: 0,
  bestScore: 0,
  bestFloor: 0,
  unlockedMutators: ["none"],
  selectedMutator: "none",
  defaultCharacter: createCharacter(),
});

export function sanitizeProfile(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return structuredClone(DEFAULT_PROFILE);
  const unlocked = Array.isArray(value.unlockedMutators)
    ? [...new Set(value.unlockedMutators.filter((id) => typeof id === "string" && MUTATORS[id]))]
    : ["none"];
  if (!unlocked.includes("none")) unlocked.unshift("none");
  const selected = typeof value.selectedMutator === "string" && unlocked.includes(value.selectedMutator)
    ? value.selectedMutator
    : "none";
  return {
    version: PROFILE_VERSION,
    runs: clampCounter(value.runs),
    wins: clampCounter(value.wins),
    bestScore: clampCounter(value.bestScore),
    bestFloor: Math.min(99, clampCounter(value.bestFloor)),
    unlockedMutators: unlocked,
    selectedMutator: selected,
    defaultCharacter: sanitizeCharacter(value.defaultCharacter),
  };
}

function clampCounter(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(2_000_000_000, Math.floor(value)));
}

export function recordRun(profileValue, result) {
  const profile = sanitizeProfile(profileValue);
  const score = clampCounter(result.score);
  const floor = clampCounter(result.floor);
  profile.runs += 1;
  profile.bestScore = Math.max(profile.bestScore, score);
  profile.bestFloor = Math.max(profile.bestFloor, floor);
  if (result.status === "victory") profile.wins += 1;
  if (profile.runs >= 3 && !profile.unlockedMutators.includes("glass")) profile.unlockedMutators.push("glass");
  if (profile.bestScore >= 500 && !profile.unlockedMutators.includes("deepPockets")) profile.unlockedMutators.push("deepPockets");
  if (profile.wins >= 1 && !profile.unlockedMutators.includes("ironEcho")) profile.unlockedMutators.push("ironEcho");
  return profile;
}

export function selectMutator(profileValue, id) {
  const profile = sanitizeProfile(profileValue);
  if (!profile.unlockedMutators.includes(id)) return { ok: false, profile, reason: "locked" };
  profile.selectedMutator = id;
  return { ok: true, profile };
}
