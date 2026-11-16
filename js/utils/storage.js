import { DEFAULT_PROFILE, sanitizeProfile } from "../core/progression.js";

export const PROFILE_STORAGE_KEY = "ashen-reach.profile.v1";
export const OPTIONS_STORAGE_KEY = "ashen-reach.options.v1";
export const DEFAULT_OPTIONS = Object.freeze({reducedEffects:false});

export function loadProfile(storage) {
  try {
    const target = storage ?? globalThis.localStorage;
    const source = target?.getItem(PROFILE_STORAGE_KEY);
    if (!source) return structuredClone(DEFAULT_PROFILE);
    return sanitizeProfile(JSON.parse(source));
  } catch {
    // Private browsing, quota/security policies or corrupt JSON fall back to a fresh profile.
    return structuredClone(DEFAULT_PROFILE);
  }
}

export function loadOptions(storage) {
  try {
    const target=storage??globalThis.localStorage;
    const source=target?.getItem(OPTIONS_STORAGE_KEY);
    if(!source)return {...DEFAULT_OPTIONS};
    const value=JSON.parse(source);
    return {reducedEffects:Boolean(value?.reducedEffects)};
  } catch { return {...DEFAULT_OPTIONS}; }
}

export function saveOptions(options,storage) {
  try {
    const target=storage??globalThis.localStorage;
    target?.setItem(OPTIONS_STORAGE_KEY,JSON.stringify({reducedEffects:Boolean(options?.reducedEffects)}));
    return true;
  } catch { return false; }
}

export function saveProfile(profile, storage) {
  try {
    const target = storage ?? globalThis.localStorage;
    target?.setItem(PROFILE_STORAGE_KEY, JSON.stringify(sanitizeProfile(profile)));
    return true;
  } catch {
    // A run remains playable; persistence is best-effort and never crashes the simulation.
    return false;
  }
}
