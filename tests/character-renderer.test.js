import test from "node:test";
import assert from "node:assert/strict";
import { createCharacter } from "../js/core/character.js";
import { buildCharacterLayers, CharacterRenderer } from "../js/ui/characterRenderer.js";

test("character layer descriptors change on gear/look and restore after removal",()=>{
  const character=createCharacter({name:"Morrow",classId:"wayfinder",appearance:{skin:"umber",hairStyle:"braided",hairColor:"silver",faceStyle:"scarred",outfitColor:"deepTeal"}});
  const base={weapon:character.startingWeapon,armor:null,helmet:null,boots:null,ring1:null,ring2:null,amulet:null};
  const before=buildCharacterLayers(character,base);
  const equipped={...base,helmet:{id:"helm",slot:"helmet",visualId:"helmet-iron",rarity:"rare"},armor:{id:"plate",slot:"armor",visualId:"armor-iron",rarity:"rare"}};
  const after=buildCharacterLayers(character,equipped);
  assert.notDeepEqual(after,before);
  assert.equal(after.find((layer)=>layer.id==="head").source,"helmet-iron");
  assert.deepEqual(buildCharacterLayers(character,base),before);
  const changed=createCharacter({name:"Morrow",classId:"wayfinder",appearance:{skin:"moon",hairStyle:"braided",hairColor:"silver",faceStyle:"scarred",outfitColor:"deepTeal"}});
  assert.notDeepEqual(buildCharacterLayers(character,base),buildCharacterLayers(changed,base));
});

test("layer compositor caches unchanged looks and recomposes after equipment changes",()=>{
  const previous=globalThis.OffscreenCanvas;
  const makeContext=()=>new Proxy({}, {get(target,key){if(key in target)return target[key];return (..._args)=>{};},set(target,key,value){target[key]=value;return true;}});
  globalThis.OffscreenCanvas=class{constructor(width,height){this.width=width;this.height=height;this.context=makeContext();}getContext(){return this.context;}};
  try{
    const renderer=new CharacterRenderer();const character=createCharacter({classId:"vanguard"});const equipment={weapon:character.startingWeapon,armor:null,helmet:null,boots:null,ring1:null,ring2:null,amulet:null};
    const scene=makeContext();renderer.draw(scene,40,40,36,character,equipment,{direction:"right",time:0});
    renderer.draw(scene,40,40,36,character,equipment,{direction:"left",time:100});
    assert.equal(renderer.recomposeCount,1);
    renderer.draw(scene,40,40,36,character,{...equipment,armor:{id:"plate",slot:"armor",visualId:"armor-iron",rarity:"rare"}},{direction:"right",time:200});
    assert.equal(renderer.recomposeCount,2);
  }finally{if(previous===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=previous;}
});
