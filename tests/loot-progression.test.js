import test from "node:test";
import assert from "node:assert/strict";
import { createLoot } from "../js/core/loot.js";
import { RARITIES } from "../js/items/rarity.js";
import { addToInventory, inventoryCount, consumeTonic } from "../js/items/inventory.js";
import { collectDropsAt, createEnemyItemDrop, makeItemDrop } from "../js/items/drops.js";
import { equipItem, equipmentBonuses, unequipItem } from "../js/items/equipment.js";
import { recordRun, sanitizeProfile, selectMutator } from "../js/core/progression.js";
import { Rng } from "../js/core/rng.js";
import { spriteIdForItem } from "../js/render/sprite-atlas.js";

test("seeded item generation and enemy drops repeat from the same seed", () => {
  const boss={type:"vault-warden",id:"warden-1"};
  const firstDrop=createEnemyItemDrop(boss,new Rng("same-drop"),createLoot,4);
  const secondDrop=createEnemyItemDrop(boss,new Rng("same-drop"),createLoot,4);
  assert.deepEqual(firstDrop,secondDrop);
  assert.equal(firstDrop.rarity,"rare");
  const first=createLoot(new Rng("loot-test"),3,{type:"weapon"});
  const second=createLoot(new Rng("loot-test"),3,{type:"weapon"});
  assert.deepEqual(first,second);
  assert.ok(first.id.startsWith("drop-"));
  assert.equal(first.slot,"weapon");
  assert.ok(first.value>0);
  assert.equal(RARITIES.length,5);
  assert.deepEqual(RARITIES.map((rarity)=>rarity.attributes),[1,2,3,4,5]);
  const stats=["attack","defense","maxHp","crit","speed","vision","lifeSteal","thorns","reach"];
  for(const rarity of RARITIES){
    const armor=createLoot(new Rng(`armor-${rarity.id}`),1,{type:"armor",rarity:rarity.id});
    assert.equal(stats.filter((key)=>armor[key]!==0).length,rarity.attributes,`${rarity.id} attribute count`);
  }
});

test("every supported loot type selects a sprite category present in the atlas",async()=>{
  const {readFile}=await import("node:fs/promises");
  const atlas=JSON.parse(await readFile(new URL("../assets/atlas.json",import.meta.url),"utf8"));
  const types=["weapon","shield","gloves","armor","helmet","boots","ring","amulet","tonic","food","scroll","key","gem","herb","material"];
  for(const type of types){
    const item=createLoot(new Rng(`sprite-loot:${type}`),3,{type});
    assert.ok(item.spriteCategory,`${type} has spriteCategory`);
    assert.ok(atlas.categories[item.spriteCategory]?.length,`${type} → ${item.spriteCategory} has atlas sprites`);
    assert.ok(atlas.sprites.some((sprite)=>sprite.id===spriteIdForItem(atlas,item)),`${type} resolves to a valid atlas id`);
    assert.ok(item.stackable===(type==="tonic"||type==="food"||type==="scroll"||type==="key"||type==="gem"||type==="herb"||type==="material"));
  }
  const categories=new Set(Array.from({length:40},(_,index)=>createLoot(new Rng(`weapon-categories:${index}`),1,{type:"weapon"}).spriteCategory));
  assert.ok(categories.has("weapon_sword"));assert.ok(categories.has("weapon_axe"));assert.ok(categories.has("weapon_staff"));
});

test("tonics and materials stack without consuming more inventory slots",()=>{
  const player={inventory:[]};
  const tonic={id:"tonic-a",name:"Warmth Tonic",type:"tonic",slot:"consumable",rarity:"rare",heal:18,stackable:true,quantity:1};
  assert.equal(addToInventory(player,tonic).ok,true);
  assert.equal(addToInventory(player,{...tonic,id:"tonic-b",name:"Another tonic",quantity:2}).stacked,true);
  assert.equal(inventoryCount(player),1);
  assert.equal(player.inventory[0].quantity,3);
  const shard={id:"shard-1",name:"Cinder Shard",type:"material",slot:"material",materialId:"cinder",rarity:"common",stackable:true,quantity:1};
  addToInventory(player,shard);addToInventory(player,{...shard,id:"shard-2",quantity:4});
  assert.equal(inventoryCount(player),2);
  assert.equal(player.inventory[1].quantity,5);
});

test("food heals and scroll consumables grant deterministic experience",()=>{
  const food=createLoot(new Rng("food-use"),2,{type:"food",rarity:"common"});
  const scroll=createLoot(new Rng("scroll-use"),2,{type:"scroll",rarity:"rare"});
  const player={hp:10,maxHp:20,xp:0,level:1,inventory:[food,scroll]};
  const healed=consumeTonic(player,food.id);
  assert.equal(healed.ok,true);assert.ok(healed.healed>0);assert.equal(player.hp,10+healed.healed);
  assert.ok(scroll.experience>0);assert.equal(scroll.slot,"consumable");
});

test("walking over a drop collects without a separate turn; full pack leaves it on the floor",()=>{
  const tonic={id:"drop-tonic",name:"Rare Warmth Tonic",slot:"consumable",type:"tonic",rarity:"rare",heal:20,stackable:true,quantity:1};
  const player={x:2,y:3,gold:0,inventory:[]};
  const ground=[makeItemDrop(tonic,2,3),{id:"coins-1",kind:"currency",amount:7,x:2,y:3,collected:false}];
  const picked=collectDropsAt(ground,player,2,3);
  assert.equal(picked.collected.length,2);
  assert.equal(player.gold,7);
  assert.equal(player.inventory[0].quantity,1);
  assert.ok(picked.messages.some((message)=>message.includes("Você pegou Rare Warmth Tonic (Raro)")));

  const full={inventory:Array.from({length:20},(_,i)=>({id:`gear-${i}`,slot:"weapon",type:"weapon"})),gold:0};
  const blocked=makeItemDrop({id:"full-item",name:"Epic Sigil",slot:"amulet",type:"amulet",rarity:"epic",quantity:1},1,1);
  const failed=collectDropsAt([blocked],full,1,1);
  assert.equal(failed.collected.length,0);
  assert.equal(blocked.collected,false);
  assert.match(failed.messages[0],/Inventário cheio/);
});

test("equipment swaps return prior gear, update totals, and unequip restores values",()=>{
  const old={id:"old-blade",name:"Old Blade",type:"weapon",slot:"weapon",attack:2,defense:0,maxHp:0,crit:0,speed:0,vision:0,lifeSteal:0,thorns:0,reach:0};
  const next={id:"new-blade",name:"New Blade",type:"weapon",slot:"weapon",attack:5,defense:0,maxHp:0,crit:.05,speed:0,vision:0,lifeSteal:0,thorns:0,reach:0};
  const player={inventory:[next],equipment:{weapon:old,armor:null,helmet:null,boots:null,ring1:null,ring2:null,amulet:null}};
  const swap=equipItem(player,"new-blade","weapon",5);
  assert.equal(swap.ok,true);
  assert.equal(player.equipment.weapon.id,"new-blade");
  assert.ok(player.inventory.some((item)=>item.id==="old-blade"));
  assert.equal(equipmentBonuses(player).attack,5);
  assert.equal(equipmentBonuses(player).crit,.05);
  const removed=unequipItem(player,"weapon",5);
  assert.equal(removed.ok,true);
  assert.equal(player.equipment.weapon,null);
  assert.equal(equipmentBonuses(player).attack,0);
  assert.ok(player.inventory.some((item)=>item.id==="new-blade"));
});

test("a full pack blocks swapping so the equipped piece cannot be lost",()=>{
  const previous={id:"old",name:"Old",type:"weapon",slot:"weapon",attack:1};
  const incoming={id:"new",name:"New",type:"weapon",slot:"weapon",attack:9};
  const player={inventory:[incoming,{id:"filler-1"},{id:"filler-2"}],equipment:{weapon:previous,armor:null,helmet:null,boots:null,ring1:null,ring2:null,amulet:null}};
  const result=equipItem(player,"new","weapon",3);
  assert.equal(result.ok,false);
  assert.equal(result.reason,"inventory-full-for-swap");
  assert.equal(player.equipment.weapon,previous);
  assert.equal(player.inventory[0],incoming);
  assert.equal(player.inventory.some((item)=>item.id==="old"),false);
});

test("shield is a separate off-hand equipment slot and contributes defense",()=>{
  const shield=createLoot(new Rng("offhand-shield"),2,{type:"shield",rarity:"rare"});shield.defense=4;
  const player={inventory:[shield],equipment:{weapon:null,shield:null,armor:null,helmet:null,boots:null,ring1:null,ring2:null,amulet:null}};
  const result=equipItem(player,shield.id,"shield");
  assert.equal(result.ok,true);assert.equal(player.equipment.shield.id,shield.id);assert.equal(equipmentBonuses(player).defense,4);
  assert.equal(unequipItem(player,"shield").ok,true);assert.equal(player.equipment.shield,null);
});

test("both ring slots can be filled and stats sum across them",()=>{
  const player={inventory:[
    {id:"ring-a",name:"Ring A",slot:"ring",type:"ring",attack:1},
    {id:"ring-b",name:"Ring B",slot:"ring",type:"ring",crit:.1},
  ],equipment:{weapon:null,armor:null,helmet:null,boots:null,ring1:null,ring2:null,amulet:null}};
  assert.equal(equipItem(player,"ring-a","ring1").ok,true);
  assert.equal(equipItem(player,"ring-b","ring2").ok,true);
  assert.equal(equipmentBonuses(player).attack,1);
  assert.equal(equipmentBonuses(player).crit,.1);
});

test("profile migration clamps invalid values and unlocks long-term mutators", () => {
  const clean=sanitizeProfile({runs:-3,wins:"bad",bestScore:50,unlockedMutators:["none","bad"]});
  assert.equal(clean.runs,0);assert.equal(clean.wins,0);assert.deepEqual(clean.unlockedMutators,["none"]);
  let next=clean;for(let run=0;run<3;run+=1)next=recordRun(next,{status:"gameover",score:600,floor:3});
  assert.ok(next.unlockedMutators.includes("glass"));assert.ok(next.unlockedMutators.includes("deepPockets"));
  assert.equal(selectMutator(next,"deepPockets").ok,true);assert.equal(selectMutator(next,"not-real").ok,false);
});
