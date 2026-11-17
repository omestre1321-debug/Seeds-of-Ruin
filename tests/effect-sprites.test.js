import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { EFFECT_SPRITES } from "../js/data/effect-sprites.js";
import { SpriteEffectRenderer } from "../js/render/sprite-effects.js";
import { MonsterRenderer } from "../js/render/monster-renderer.js";

const atlas=JSON.parse(await fs.readFile(new URL("../assets/atlas.json",import.meta.url),"utf8"));
function contextSpy(){const events=[];return{events,context:new Proxy({globalAlpha:1,globalCompositeOperation:"source-over"},{get(target,key){if(key in target)return target[key];return(...args)=>events.push([key,...args]);},set(target,key,value){target[key]=value;events.push(["set",key,value]);return true;}})};}
function spriteSpy(){const calls=[];return{calls,atlas:{sprites:atlas.sprites},getSprite(id){return atlas.sprites.find((sprite)=>sprite.id===id)??null;},draw(_context,id,_x,_y,options){calls.push({id,options});return true;}};}

test("all gameplay effect and emote mappings reference the effects sheet",()=>{
  for(const [name,effect]of Object.entries(EFFECT_SPRITES)){
    const sprite=atlas.sprites.find((entry)=>entry.id===effect.spriteId);
    assert.ok(sprite,`${name} -> ${effect.spriteId}`);
    assert.equal(sprite.sheet,"effects");
    assert.ok(sprite.category.startsWith("effect_"));
  }
});

test("sprite effects are bounded, expire, respect FOV, and reduced mode drops decorative-only effects",()=>{
  const sprites=spriteSpy();const renderer=new SpriteEffectRenderer({spriteAtlas:sprites,maxEffects:2});
  const layout={tileSize:16,offsetX:4,offsetY:6};const state={map:{width:3,height:3},visible:Uint8Array.from([0,0,0,0,1,0,0,0,0])};
  assert.equal(renderer.emit("slash",{x:20,y:22,tileX:1,tileY:1},10),true);
  assert.equal(renderer.emit("fire",{x:4,y:6,tileX:0,tileY:0},10),true);
  assert.equal(renderer.emit("magic",{x:20,y:22,tileX:1,tileY:1},10),true);
  assert.equal(renderer.active.length,2,"oldest effect is discarded at the pool cap");
  const {context}=contextSpy();renderer.draw(context,state,layout,20,false);
  assert.ok(sprites.calls.every((call)=>call.id!==EFFECT_SPRITES.fire.spriteId),"off-FOV effect never draws");
  const visibleCalls=sprites.calls.length;
  assert.ok(visibleCalls>0);
  const reduced=spriteSpy();const reducedRenderer=new SpriteEffectRenderer({spriteAtlas:reduced,maxEffects:4});
  reducedRenderer.emit("slash",{x:20,y:22,tileX:1,tileY:1},0);reducedRenderer.emit("fire",{x:20,y:22,tileX:1,tileY:1},0);
  reducedRenderer.draw(context,state,layout,10,true);
  assert.deepEqual(reduced.calls.map((call)=>call.id),[EFFECT_SPRITES.slash.spriteId]);
  reducedRenderer.draw(context,state,layout,900,false);
  assert.equal(reducedRenderer.active.length,0,"expired effects are removed");
});

test("monster notice emotes use speech-bubble sprites and never draw outside FOV",()=>{
  const sprites=spriteSpy();const renderer=new MonsterRenderer({spriteAtlas:sprites});
  const enemy={id:"guard",type:"ashen-sentry",behavior:"sentry",spriteId:"characters-r00-c03-p004",spriteCategory:"player_body",family:"bandit",x:1,y:1,hp:10,maxHp:10,alive:true,facing:"right"};
  const state={map:{width:3,height:3},visible:Uint8Array.from([0,0,0,0,1,0,0,0,0]),player:{x:1,y:2},enemies:[enemy]};
  const {context}=contextSpy();renderer.draw(context,state,{tileSize:16,offsetX:4,offsetY:6},100);
  assert.ok(sprites.calls.some((call)=>call.id===enemy.spriteId));
  assert.ok(sprites.calls.some((call)=>call.id===EFFECT_SPRITES.emoteAlert.spriteId));
  const before=sprites.calls.length;state.visible.fill(0);renderer.draw(context,state,{tileSize:16,offsetX:4,offsetY:6},180);
  assert.equal(sprites.calls.length,before,"hidden enemy and bubble remain hidden");
});
