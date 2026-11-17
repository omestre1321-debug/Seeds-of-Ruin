import test from "node:test";
import assert from "node:assert/strict";
import { createCharacter } from "../js/core/character.js";
import { PLAYER_ANCHORS, PLAYER_PALETTE_MASKS } from "../js/data/sprite-character-visuals.js";
import { CharacterRenderer, buildCharacterLayers } from "../js/ui/characterRenderer.js";

function makeContext(events=[]) {
  return new Proxy({ imageSmoothingEnabled: true, globalAlpha: 1 }, {
    get(target,key){if(key in target)return target[key];return(...args)=>events.push([key,...args]);},
    set(target,key,value){target[key]=value;events.push(["set",key,value]);return true;},
  });
}

function fakeAtlas() {
  const drawn=[];
  const categories={weapon_sword:["sword"],shield:["shield"],chest_armor:["armor"],gloves:["gloves"],helmet:["helmet"],boots:["boots"],ring:["ring"],amulet:["amulet"]};
  const sprites=Object.values(categories).flat().map((id)=>({id,width:16,height:16}));
  return {drawn,atlas:{categories,sprites},getSprite(id){return sprites.find((sprite)=>sprite.id===id)??null;},draw(_context,id,_x,_y,options){drawn.push({id,options});return true;},drawPlaceholder(){}};
}

const equipped={
  weapon:{id:"w",type:"weapon",slot:"weapon",spriteCategory:"weapon_sword",rarity:"epic"},
  shield:{id:"s",type:"shield",slot:"shield",spriteCategory:"shield",rarity:"rare"},
  armor:{id:"a",type:"armor",slot:"armor",spriteCategory:"chest_armor",rarity:"legendary",material:"giltsteel"},
  gloves:{id:"g",type:"gloves",slot:"gloves",spriteCategory:"gloves",rarity:"uncommon"},
  helmet:{id:"h",type:"helmet",slot:"helmet",spriteCategory:"helmet",rarity:"rare"},
  boots:{id:"b",type:"boots",slot:"boots",spriteCategory:"boots",rarity:"rare"},
  ring1:{id:"r1",type:"ring",slot:"ring",spriteCategory:"ring",rarity:"rare"},
  ring2:null,
  amulet:{id:"m",type:"amulet",slot:"amulet",spriteCategory:"amulet",rarity:"epic"},
};

test("player layer data stays procedural and gear anchors/masks cover hands, head and feet",()=>{
  const character=createCharacter({classId:"wayfinder",appearance:{skin:"umber",outfitColor:"deepTeal"}});
  const layers=buildCharacterLayers(character,{});
  assert.match(layers.find((layer)=>layer.id==="body").source,/^skin:/);
  assert.ok(!layers.find((layer)=>layer.id==="body").source.startsWith("characters-"));
  for(const anchor of ["head","neck","mainHand","offHand","ringMain","ringOff","leftFoot","rightFoot"])assert.ok(Number.isFinite(PLAYER_ANCHORS[anchor].x)&&Number.isFinite(PLAYER_ANCHORS[anchor].y));
  for(const mask of ["armor","boots","hands","hair"])assert.ok(PLAYER_PALETTE_MASKS[mask].length>0);
});

test("sprites are used for gear only; gear/look changes recompose the cached procedural delver",()=>{
  const previous=globalThis.OffscreenCanvas;
  globalThis.OffscreenCanvas=class{constructor(width,height){this.width=width;this.height=height;this.context=makeContext();}getContext(){return this.context;}};
  const atlas=fakeAtlas();
  try{
    const character=createCharacter({classId:"wayfinder",appearance:{skin:"umber",hairColor:"silver",outfitColor:"deepTeal"}});
    const layers=buildCharacterLayers(character,equipped);
    assert.match(layers.find((layer)=>layer.id==="body").source,/^skin:/);
    assert.equal(layers.find((layer)=>layer.id==="head").source,"helmet");
    assert.equal(layers.find((layer)=>layer.id==="armor").source,"chest_armor");
    const renderer=new CharacterRenderer({spriteAtlas:atlas});
    renderer.draw(makeContext(),40,40,40,character,equipped,{direction:"right",time:100,swing:.8});
    assert.equal(renderer.recomposeCount,1);
    assert.ok(atlas.drawn.some((entry)=>entry.id==="helmet"));
    assert.ok(atlas.drawn.some((entry)=>entry.id==="shield"));
    assert.ok(atlas.drawn.some((entry)=>entry.id==="sword"));
    assert.ok(atlas.drawn.every((entry)=>Number.isInteger(entry.options.scale)));
    assert.ok(atlas.drawn.every((entry)=>!String(entry.id).startsWith("characters-")),"the player body remains the original drawn silhouette");
    renderer.draw(makeContext(),40,40,40,character,{...equipped,armor:{...equipped.armor,id:"a2",rarity:"common"}},{direction:"left",time:200});
    assert.equal(renderer.recomposeCount,2);
    const differentAppearance=createCharacter({classId:"wayfinder",appearance:{skin:"moon",hairColor:"copper",outfitColor:"moss"}});
    renderer.draw(makeContext(),40,40,40,differentAppearance,equipped,{direction:"right",time:300});
    assert.equal(renderer.recomposeCount,3,"appearance changes invalidate the cached silhouette composite");
  }finally{if(previous===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=previous;}
});

test("procedural player and attached weapon remain fully inside a viewport at the left edge",()=>{
  const previous=globalThis.OffscreenCanvas;
  globalThis.OffscreenCanvas=class{constructor(width,height){this.width=width;this.height=height;this.context=makeContext();}getContext(){return this.context;}};
  const drawn=[];const context=makeContext(drawn);context.canvas={width:100,height:80};
  const atlas=fakeAtlas();const character=createCharacter({classId:"vanguard"});const renderer=new CharacterRenderer({spriteAtlas:atlas});
  try{
    renderer.draw(context,2,40,40,character,equipped,{direction:"left",time:0});
    const body=drawn.find(([name])=>name==="drawImage");
    assert.ok(body);
    assert.ok(body[2]>=0&&body[3]>=0,"body destination starts inside the Canvas");
    assert.ok(body[2]+body[4]<=context.canvas.width&&body[3]+body[5]<=context.canvas.height);
  }finally{if(previous===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=previous;}
});
