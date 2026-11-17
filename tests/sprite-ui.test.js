import test from "node:test";
import assert from "node:assert/strict";
import { drawGame } from "../js/render/dungeon-renderer.js";
import { spriteIdForItem } from "../js/render/sprite-atlas.js";
import { createGame } from "../js/core/game.js";

function drawingContext() {
  return new Proxy({globalCompositeOperation:"source-over",globalAlpha:1}, {
    get(target,key){if(key in target)return target[key];return (..._args)=>{};},
    set(target,key,value){target[key]=value;return true;},
  });
}

test("visible floor drops use their rarity-selected atlas sprite in the dungeon renderer",()=>{
  const state=createGame("sprite-drop");
  const index=state.player.y*state.map.width+state.player.x;
  state.visible[index]=1;state.explored[index]=1;
  const item={id:"sprite-drop",type:"weapon",slot:"weapon",spriteCategory:"weapon_sword",rarity:"legendary",floor:4,color:"#ffc45f",rarityGlow:1};
  state.drops=[{id:"sprite-drop",entityId:"sprite-drop",x:state.player.x,y:state.player.y,collected:false,item}];
  const selected=[];
  const atlas={
    atlas:{categories:{weapon_sword:["sword-common","sword-rare","sword-legendary"]}},
    getSprite(id){return {id,width:16,height:16};},
    draw(_context,id,x,y,options){selected.push({id,x,y,options});return true;},
  };
  drawGame(drawingContext(),state,600,360,{drawCharacter:false,spriteAtlas:atlas});
  assert.equal(selected.length,1);
  assert.equal(selected[0].id,spriteIdForItem(atlas.atlas,item));
  assert.equal(selected[0].id,"sword-legendary");
  assert.equal(selected[0].options.scale,1);
});
