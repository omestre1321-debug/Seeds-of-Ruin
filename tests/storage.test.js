import test from "node:test";
import assert from "node:assert/strict";
import { loadOptions, loadProfile, saveOptions, saveProfile, OPTIONS_STORAGE_KEY, PROFILE_STORAGE_KEY } from "../js/utils/storage.js";
import { createCharacter } from "../js/core/character.js";

function memoryStorage(initial={}) {
  const values=new Map(Object.entries(initial));
  return {
    getItem(key){ return values.has(key)?values.get(key):null; },
    setItem(key,value){ values.set(key,String(value)); },
  };
}

test("profile storage round-trips a sanitized progress record",()=>{
  const storage=memoryStorage();
  const profile={version:1,runs:5,wins:2,bestScore:900,bestFloor:4,unlockedMutators:["none","glass"],selectedMutator:"glass",defaultCharacter:createCharacter({name:"Morrow Vale",classId:"wayfinder",appearance:{skin:"umber",hairStyle:"braided",hairColor:"silver",faceStyle:"scarred",outfitColor:"deepTeal"}})};
  assert.equal(saveProfile(profile,storage),true);
  assert.deepEqual(loadProfile(storage),profile);
  assert.ok(storage.getItem(PROFILE_STORAGE_KEY));
});

test("reduced-effects preference is saved and restored defensively",()=>{
  const storage=memoryStorage();
  assert.deepEqual(loadOptions(storage),{reducedEffects:false});
  assert.equal(saveOptions({reducedEffects:true},storage),true);
  assert.deepEqual(loadOptions(storage),{reducedEffects:true});
  assert.ok(storage.getItem(OPTIONS_STORAGE_KEY));
});

test("unavailable or corrupt localStorage safely falls back to a fresh profile",()=>{
  const denied={getItem(){throw new Error("blocked")},setItem(){throw new Error("blocked")}};
  assert.equal(loadProfile(denied).runs,0);
  assert.equal(saveProfile({runs:1},denied),false);
  assert.equal(loadProfile(memoryStorage({[PROFILE_STORAGE_KEY]:"not-json"})).bestScore,0);
});
