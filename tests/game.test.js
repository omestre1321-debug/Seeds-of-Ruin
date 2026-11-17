import test from "node:test";
import assert from "node:assert/strict";
import { performAction, createGame, getRunSummary } from "../js/core/game.js";
import { ENEMY_TYPES, createEnemy } from "../js/core/enemies.js";
import { generateFloor } from "../js/core/map/floor.js";
import { TILE } from "../js/core/map/tiles.js";
import { makeItemDrop } from "../js/items/drops.js";

function setPlayerAdjacentTo(state, target) {
  const choices = [[0,-1],[1,0],[0,1],[-1,0]];
  const step = choices.find(([dx,dy]) => {
    const x=target.x+dx; const y=target.y+dy;
    return state.map.tiles[y*state.map.width+x] !== TILE.WALL;
  });
  assert.ok(step, "target should have a floor neighbor");
  state.player.x=target.x+step[0]; state.player.y=target.y+step[1];
}

test("runs replay from the same seed and invalid movement does not spend a turn", () => {
  const first=createGame("replay"); const second=createGame("replay");
  assert.deepEqual(Array.from(first.map.tiles),Array.from(second.map.tiles));
  assert.deepEqual(first.enemies.map(({id,type,x,y})=>({id,type,x,y})),second.enemies.map(({id,type,x,y})=>({id,type,x,y})));
  const before=first.turn;
  let blocked;
  for (let y=1;y<first.map.height-1&&!blocked;y+=1) for (let x=1;x<first.map.width-1&&!blocked;x+=1) {
    if (first.map.tiles[y*first.map.width+x]===TILE.WALL) continue;
    blocked=[[0,-1],[1,0],[0,1],[-1,0]].find(([dx,dy])=>first.map.tiles[(y+dy)*first.map.width+x+dx]===TILE.WALL);
    if (blocked) { first.player.x=x; first.player.y=y; }
  }
  assert.ok(blocked);
  const result=performAction(first,{type:"move",dx:blocked[0],dy:blocked[1]});
  assert.equal(result.ok,false);
  assert.equal(first.turn,before);
});

test("fog of war starts at the spawn and charted tiles persist across turns", () => {
  const state=createGame("fog-run");
  const before=state.explored.reduce((sum,value)=>sum+value,0);
  assert.equal(state.visible[state.player.y*state.map.width+state.player.x],1);
  const move=[[0,-1],[1,0],[0,1],[-1,0]].map(([dx,dy])=>({dx,dy})).find(({dx,dy})=>state.map.tiles[(state.player.y+dy)*state.map.width+state.player.x+dx]!==TILE.WALL);
  assert.ok(move);
  performAction(state,{type:"move",...move});
  assert.ok(state.explored.reduce((sum,value)=>sum+value,0)>=before);
});

test("a floor drop is auto-collected on the movement turn and remains when the pack is full",()=>{
  const state=createGame("pickup-run");
  const next=[[0,-1],[1,0],[0,1],[-1,0]].map(([dx,dy])=>({x:state.player.x+dx,y:state.player.y+dy,dx,dy})).find((cell)=>state.map.tiles[cell.y*state.map.width+cell.x]!==TILE.WALL&&!state.enemies.some((enemy)=>enemy.alive&&enemy.x===cell.x&&enemy.y===cell.y));
  assert.ok(next);
  const item={id:"pickup-weapon",name:"Rare Glass Pike",slot:"weapon",type:"weapon",rarity:"rare",attack:5,quantity:1,color:"#79bdf0"};
  const drop=makeItemDrop(item,next.x,next.y);
  state.drops=[drop];
  const turn=state.turn;
  performAction(state,{type:"move",dx:next.dx,dy:next.dy});
  assert.equal(drop.collected,true);
  assert.ok(state.player.inventory.some((entry)=>entry.id===item.id));
  assert.equal(state.turn,turn+1);
  assert.ok(state.log.some((entry)=>entry.text.includes("Você pegou Rare Glass Pike")));

  const full=createGame("pickup-full");
  full.player.inventory=Array.from({length:20},(_,index)=>({id:`pack-${index}`,slot:"material",type:"material",materialId:`m${index}`,quantity:1,stackable:true}));
  const target=[[0,-1],[1,0],[0,1],[-1,0]].map(([dx,dy])=>({x:full.player.x+dx,y:full.player.y+dy,dx,dy})).find((cell)=>full.map.tiles[cell.y*full.map.width+cell.x]!==TILE.WALL&&!full.enemies.some((enemy)=>enemy.alive&&enemy.x===cell.x&&enemy.y===cell.y));
  const blocked=makeItemDrop({...item,id:"blocked-pickup"},target.x,target.y);full.drops=[blocked];
  performAction(full,{type:"move",dx:target.dx,dy:target.dy});
  assert.equal(blocked.collected,false);
  assert.ok(full.log.some((entry)=>entry.text.includes("Inventário cheio")));
});

test("a defeated enemy grants progression and ends combat without mutating the map API", () => {
  const state=createGame("combat-run");
  const target={x:state.player.x+1,y:state.player.y};
  state.enemies=[createEnemy(ENEMY_TYPES.SENTRY,"test-sentry",target,1)];
  state.enemies[0].hp=1;
  const result=performAction(state,{type:"attack",targetId:"test-sentry"});
  assert.equal(result.ok,true);
  assert.equal(state.enemies[0].alive,false);
  assert.equal(state.kills,1);
  assert.ok(state.player.xp>0);
  assert.ok(state.log.some((entry)=>entry.text.includes("falls")));
});

test("class passives apply as deterministic combat rules",()=>{
  const vanguard=createGame("stoneward");
  const enemy=createEnemy(ENEMY_TYPES.SENTRY,"heavy-sentry",{x:vanguard.player.x+1,y:vanguard.player.y},1);
  enemy.attack=10;enemy.crit=0;vanguard.enemies=[enemy];
  const before=vanguard.player.hp;
  performAction(vanguard,{type:"wait"});
  assert.equal(vanguard.player.passiveUsedFloor,1);
  assert.ok(before-vanguard.player.hp<=7);
  assert.ok(vanguard.log.some((entry)=>entry.text.includes("Stoneward")));
});

test("permadeath terminates the run and rejects later actions", () => {
  const state=createGame("permadeath");
  const enemy=createEnemy(ENEMY_TYPES.SENTRY,"fatal-test",{x:state.player.x+1,y:state.player.y},1);
  enemy.attack=100; enemy.crit=0; state.enemies=[enemy]; state.player.hp=1;
  assert.equal(performAction(state,{type:"wait"}).ok,true);
  assert.equal(state.status,"gameover");
  assert.ok(state.score>0);
  assert.equal(performAction(state,{type:"wait"}).reason,"run-ended");
});

test("equipping and removing gear recalculates live player stats", () => {
  const state=createGame("gear-stats");
  const base=state.player.attack;
  const weapon={id:"test-relic",name:"Rare Test Relic",slot:"weapon",type:"weapon",rarity:"rare",attack:7,defense:0,maxHp:0,crit:.04,speed:0,vision:0,lifeSteal:0,thorns:0,reach:0};
  state.player.inventory.push(weapon);
  assert.equal(performAction(state,{type:"equip",itemId:weapon.id,slot:"weapon"}).ok,true);
  assert.equal(state.player.equipment.weapon.id,weapon.id);
  assert.equal(state.player.attack,base-2+7);
  assert.ok(state.player.inventory.some((item)=>item.id===state.player.character.startingWeapon.id));
  assert.equal(performAction(state,{type:"unequip",slot:"weapon"}).ok,true);
  assert.equal(state.player.equipment.weapon,null);
  assert.equal(state.player.attack,base-2);
});

test("equipped gear can be placed on the floor without entering the pack",()=>{
  const state=createGame("drop-gear");
  const weapon=state.player.equipment.weapon;
  const result=performAction(state,{type:"drop_equipment",slot:"weapon"});
  assert.equal(result.ok,true);
  assert.equal(state.player.equipment.weapon,null);
  assert.equal(state.player.inventory.some((item)=>item.id===weapon.id),false);
  assert.ok(state.drops.some((drop)=>drop.item.id===weapon.id&&drop.source==="equipped"));
});

test("shop stays turn-paused and purchase validates gold and inventory capacity", () => {
  const state=createGame("shop-run");
  const shop=state.features.find((feature)=>feature.type==="shop");
  assert.ok(shop);
  state.player.x=shop.x; state.player.y=shop.y; state.player.gold=1000;
  const before=state.turn;
  assert.equal(performAction(state,{type:"interact"}).ok,true);
  assert.equal(state.overlay.type,"shop");
  assert.equal(state.turn,before);
  const offer=state.overlay.stock[0];
  assert.equal(performAction(state,{type:"buy",itemId:offer.item.id}).ok,true);
  assert.ok(state.player.inventory.some((item)=>item.id===offer.item.id));
  assert.equal(state.player.gold,1000-offer.cost);
  performAction(state,{type:"close"});
  assert.equal(state.overlay,null);
});

test("event choices apply only the selected outcome", () => {
  const state=createGame("event-run");
  state.player.gold=10;
  state.overlay={type:"event",featureId:"event-x",event:{type:"shrine",choices:[{id:"offer-gold"},{id:"take-flame"}]}};
  const maxBefore=state.player.maxHp;
  const choice=performAction(state,{type:"choose",choiceId:"take-flame"});
  assert.equal(choice.ok,true);
  assert.equal(state.player.baseAttack,6);
  assert.equal(state.player.maxHp,maxBefore-4);
  assert.equal(state.player.gold,10);
});

test("inventory and equipment survive a floor transition",()=>{
  const state=createGame("carry-run");
  const gear={id:"carried-helm",name:"Carried Helm",slot:"helmet",type:"helmet",rarity:"rare",defense:2,spriteCategory:"helmet"};
  state.player.inventory.push(gear);
  performAction(state,{type:"equip",itemId:gear.id});
  const weaponId=state.player.equipment.weapon.id;
  state.player.x=state.map.stairs.x;state.player.y=state.map.stairs.y;
  assert.equal(performAction(state,{type:"descend"}).ok,true);
  assert.equal(state.player.equipment.helmet.id,gear.id);
  assert.equal(state.player.equipment.weapon.id,weaponId);
});

test("floors descend deterministically and the final warden completes a win", () => {
  const state=createGame("stairs-run",{}, {maxFloors:4});
  state.player.x=state.map.stairs.x; state.player.y=state.map.stairs.y;
  assert.equal(performAction(state,{type:"descend"}).ok,true);
  assert.equal(state.floor,2);
  assert.equal(state.map.tiles[state.map.start.y*state.map.width+state.map.start.x],TILE.STAIRS_UP);

  const final=generateFloor("stairs-run",4,4);
  state.floor=4; state.map=final.map; state.features=final.features; state.enemies=final.enemies; state.drops=[];
  const boss=state.enemies.find((enemy)=>enemy.type===ENEMY_TYPES.BOSS);
  assert.ok(boss);
  setPlayerAdjacentTo(state,boss);
  boss.hp=1;
  const won=performAction(state,{type:"attack",targetId:boss.id});
  assert.equal(won.ok,true);
  assert.equal(state.status,"victory");
  assert.equal(getRunSummary(state).bossDefeated,true);
});
