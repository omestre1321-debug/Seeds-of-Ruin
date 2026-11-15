import test from "node:test";
import assert from "node:assert/strict";
import { loadProfile, saveProfile, PROFILE_STORAGE_KEY } from "../js/utils/storage.js";

function memoryStorage(initial={}) {
  const values=new Map(Object.entries(initial));
  return {
    getItem(key){ return values.has(key)?values.get(key):null; },
    setItem(key,value){ values.set(key,String(value)); },
  };
}

test("profile storage round-trips a sanitized progress record",()=>{
  const storage=memoryStorage();
  const profile={version:1,runs:5,wins:2,bestScore:900,bestFloor:4,unlockedMutators:["none","glass"],selectedMutator:"glass"};
  assert.equal(saveProfile(profile,storage),true);
  assert.deepEqual(loadProfile(storage),profile);
  assert.ok(storage.getItem(PROFILE_STORAGE_KEY));
});

test("unavailable or corrupt localStorage safely falls back to a fresh profile",()=>{
  const denied={getItem(){throw new Error("blocked")},setItem(){throw new Error("blocked")}};
  assert.equal(loadProfile(denied).runs,0);
  assert.equal(saveProfile({runs:1},denied),false);
  assert.equal(loadProfile(memoryStorage({[PROFILE_STORAGE_KEY]:"not-json"})).bestScore,0);
});
