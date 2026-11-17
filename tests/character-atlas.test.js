import test from "node:test";
import assert from "node:assert/strict";
import { createCharacter } from "../js/core/character.js";
import { PLAYER_BODY_VARIANTS } from "../js/data/sprite-character-visuals.js";
import { CharacterRenderer, buildCharacterLayers } from "../js/ui/characterRenderer.js";

function makeContext() {
  return new Proxy({ imageSmoothingEnabled: true, globalAlpha: 1 }, {
    get(target,key){if(key in target)return target[key];return (..._args)=>{};},
    set(target,key,value){target[key]=value;return true;},
  });
}

function fakeAtlas() {
  const drawn=[];
  const categories={weapon_sword:["sword"],shield:["shield"],chest_armor:["armor"],gloves:["gloves"],helmet:["helmet"],boots:["boots"],ring:["ring"],amulet:["amulet"],player_body:PLAYER_BODY_VARIANTS.map((body)=>body.spriteId)};
  const sprites=Object.values(categories).flat().map((id)=>({id,width:16,height:16}));
  return {
    drawn,
    atlas:{categories,sprites},
    getSprite(id){return sprites.find((sprite)=>sprite.id===id)??null;},
    draw(_context,id,_x,_y,options){drawn.push({id,options});return true;},
    drawPlaceholder(){},
  };
}

const equipped={
  weapon:{id:"w",type:"weapon",slot:"weapon",spriteCategory:"weapon_sword",rarity:"epic"},
  shield:{id:"s",type:"shield",slot:"shield",spriteCategory:"shield",rarity:"rare"},
  armor:{id:"a",type:"armor",slot:"armor",spriteCategory:"chest_armor",rarity:"legendary"},
  gloves:{id:"g",type:"gloves",slot:"gloves",spriteCategory:"gloves",rarity:"uncommon"},
  helmet:{id:"h",type:"helmet",slot:"helmet",spriteCategory:"helmet",rarity:"rare"},
  boots:{id:"b",type:"boots",slot:"boots",spriteCategory:"boots",rarity:"rare"},
  ring1:{id:"r1",type:"ring",slot:"ring",spriteCategory:"ring",rarity:"rare"},
  ring2:null,
  amulet:{id:"m",type:"amulet",slot:"amulet",spriteCategory:"amulet",rarity:"epic"},
};

test("every selectable player body variant points to a unique atlas sprite and has hand/foot anchors",()=>{
  assert.ok(PLAYER_BODY_VARIANTS.length>=4);
  assert.equal(new Set(PLAYER_BODY_VARIANTS.map((body)=>body.spriteId)).size,PLAYER_BODY_VARIANTS.length);
  for(const body of PLAYER_BODY_VARIANTS){
    assert.match(body.spriteId,/^characters-/);
    for(const anchor of ["head","mainHand","offHand","leftFoot","rightFoot","neck","ringMain","ringOff"])assert.ok(Number.isFinite(body.anchors[anchor].x)&&Number.isFinite(body.anchors[anchor].y));
    for(const mask of ["skin","hair","clothing","armor","boots","hands"])assert.ok(body.masks[mask].length>0);
  }
});

test("visible equipment layers use atlas IDs, preserve palette masks, and recompute after a gear change",()=>{
  const previous=globalThis.OffscreenCanvas;
  globalThis.OffscreenCanvas=class{constructor(width,height){this.width=width;this.height=height;this.context=makeContext();}getContext(){return this.context;}};
  const atlas=fakeAtlas();
  try{
    const character=createCharacter({classId:"wayfinder",appearance:{bodyVariant:PLAYER_BODY_VARIANTS[1].id,outfitColor:"deepTeal"}});
    const layers=buildCharacterLayers(character,equipped);
    assert.equal(layers.find((layer)=>layer.id==="body").source,PLAYER_BODY_VARIANTS[1].spriteId);
    assert.equal(layers.find((layer)=>layer.id==="head").source,"helmet");
    assert.equal(layers.find((layer)=>layer.id==="armor").source,"chest_armor");
    assert.equal(layers.find((layer)=>layer.id==="armor").rarity,"legendary");
    const renderer=new CharacterRenderer({spriteAtlas:atlas});
    renderer.draw(makeContext(),40,40,40,character,equipped,{direction:"right",time:100,swing:.8});
    assert.equal(renderer.recomposeCount,1);
    assert.ok(atlas.drawn.some((entry)=>entry.id===PLAYER_BODY_VARIANTS[1].spriteId));
    assert.ok(atlas.drawn.some((entry)=>entry.id==="helmet"));
    assert.ok(atlas.drawn.some((entry)=>entry.id==="shield"));
    assert.ok(atlas.drawn.some((entry)=>entry.id==="sword"));
    assert.ok(atlas.drawn.every((entry)=>Number.isInteger(entry.options.scale)));
    renderer.draw(makeContext(),40,40,40,character,{...equipped,armor:{...equipped.armor,id:"a2",rarity:"common"}},{direction:"left",time:200});
    assert.equal(renderer.recomposeCount,2);
    const differentBody=createCharacter({classId:"wayfinder",appearance:{bodyVariant:PLAYER_BODY_VARIANTS[2].id,outfitColor:"deepTeal"}});
    renderer.draw(makeContext(),40,40,40,differentBody,equipped,{direction:"right",time:300});
    assert.equal(renderer.recomposeCount,3,"body variant changes invalidate the composite cache");
  }finally{if(previous===undefined)delete globalThis.OffscreenCanvas;else globalThis.OffscreenCanvas=previous;}
});
