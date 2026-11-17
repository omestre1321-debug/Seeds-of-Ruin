import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { MONSTERS, MONSTERS_BY_BIOME } from "../js/data/monsters.js";
import { createEnemy, ENEMY_TYPES } from "../js/core/enemies.js";
import { generateFloor } from "../js/core/map/floor.js";
import { MonsterRenderer } from "../js/render/monster-renderer.js";

const atlas=JSON.parse(await fs.readFile(new URL("../assets/atlas.json",import.meta.url),"utf8"));

function fakeContext(events=[]){return new Proxy({globalAlpha:1,globalCompositeOperation:"source-over"},{
  get(target,key){if(key in target)return target[key];return(...args)=>events.push([key,...args]);},
  set(target,key,value){target[key]=value;events.push(["set",key,value]);return true;},
});}

test("at least eight data-driven monster types reference valid character sprites",()=>{
  const types=Object.values(MONSTERS);
  assert.ok(types.filter((monster)=>!monster.boss).length>=8);
  for(const monster of types){
    assert.ok(monster.name&&monster.family&&monster.behavior);
    assert.ok(monster.hp>0&&monster.attack>0&&monster.spriteId);
    assert.ok(atlas.sprites.some((sprite)=>sprite.id===monster.spriteId),`${monster.id} -> ${monster.spriteId}`);
  }
  for(const [biome,ids]of Object.entries(MONSTERS_BY_BIOME)){
    assert.ok(ids.length>0,`${biome} has no roster`);
    for(const id of ids)assert.ok(MONSTERS[id]?.biomes.includes(biome),`${id} is not assigned to ${biome}`);
  }
});

test("same seed repeats monster types, sprites, elite variants and positions",()=>{
  for(let floor=1;floor<=4;floor++){
    const first=generateFloor("MONSTER-REPLAY",floor,4);
    const second=generateFloor("MONSTER-REPLAY",floor,4);
    const signature=(floorData)=>floorData.enemies.map(({id,type,spriteId,elite,eliteTint,x,y,hp,attack})=>({id,type,spriteId,elite,eliteTint,x,y,hp,attack}));
    assert.deepEqual(signature(first),signature(second));
    const biome=first.map.biomeId;
    for(const enemy of first.enemies.filter((entry)=>entry.type!==ENEMY_TYPES.BOSS))assert.ok(MONSTERS_BY_BIOME[biome].includes(enemy.type));
  }
  const types=new Set();for(let seed=0;seed<40;seed++)for(let floor=1;floor<=4;floor++)for(const enemy of generateFloor(`MONSTER-VARIETY-${seed}`,floor,4).enemies)types.add(enemy.type);
  assert.ok(types.size>=8);
});

test("monster rendering uses atlas sprites, FOV clips actors, and hit/death animation is transient",()=>{
  const definition=MONSTERS[ENEMY_TYPES.SENTRY];
  const enemy=createEnemy(definition.id,"test-sprite-enemy",{x:1,y:1},1,null,{elite:true,spawnBiome:"stone"});
  const map={width:3,height:3,tiles:new Uint8Array(9),biomeId:"stone"};
  const state={map,visible:Uint8Array.from([0,0,0,0,1,0,0,0,0]),player:{x:1,y:2},enemies:[enemy]};
  const calls=[];const spriteAtlas={getSprite(id){return atlas.sprites.find((entry)=>entry.id===id);},draw(_context,id,x,y,options){calls.push({id,x,y,options});return true;}};
  const renderer=new MonsterRenderer({spriteAtlas});const context=fakeContext();const layout={tileSize:16,offsetX:4,offsetY:6};
  renderer.draw(context,state,layout,100);
  assert.ok(calls.some((entry)=>entry.id===definition.spriteId));
  const before=calls.length;state.visible.fill(0);renderer.draw(context,state,layout,120);assert.equal(calls.length,before,"hidden actors are not drawn through fog");
  state.visible[4]=1;enemy.hp-=2;renderer.draw(context,state,layout,150);
  enemy.alive=false;renderer.draw(context,state,layout,180);
  assert.ok(calls.length>before);
  const atDeath=calls.length;renderer.draw(context,state,layout,1000);assert.equal(calls.length,atDeath,"death sprite stops drawing after its fade window");
});
