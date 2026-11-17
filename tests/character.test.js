import test from "node:test";
import assert from "node:assert/strict";
import { createCharacter } from "../js/core/character.js";
import { buildCharacterLayers } from "../js/ui/characterRenderer.js";

test("layer order is stable and a helmet substitutes for hair",()=>{
  const character=createCharacter({classId:"emberAdept",appearance:{hairStyle:"coils",hairColor:"copper"}});
  const bare={weapon:character.startingWeapon,armor:null,helmet:null,boots:null,ring1:null,ring2:null,amulet:null};
  const layers=buildCharacterLayers(character,bare);
  assert.deepEqual(layers.map((layer)=>layer.id),["shadow","body","outfit","boots","armor","head","accessories","weapon","effects"]);
  assert.equal(layers.find((layer)=>layer.id==="head").source,"hair:coils:copper");
  const armored={...bare,helmet:{id:"veil",slot:"helmet",spriteCategory:"helmet",rarity:"epic"}};
  assert.equal(buildCharacterLayers(character,armored).find((layer)=>layer.id==="head").source,"helmet");
});
