import test from "node:test";
import assert from "node:assert/strict";
import { createGame, performAction } from "../js/core/game.js";
import { ENEMY_TYPES } from "../js/core/enemies.js";
import { findPath } from "../js/core/pathfinding.js";

function playGreedyRun(seed) {
  const state=createGame(seed,{}, {maxFloors:4});
  let actions=0;
  while(state.status==="playing"&&actions<700){
    actions+=1;
    const tonic=state.player.inventory.find((item)=>item.slot==="consumable");
    if(tonic&&state.player.hp<=state.player.maxHp*.65){performAction(state,{type:"use",itemId:tonic.id});continue;}
    if(state.overlay?.type==="event"){
      const type=state.overlay.event.type;
      const choice=type==="shrine"?(state.player.gold>=8&&state.player.hp<state.player.maxHp-10?"offer-gold":"take-flame")
        :type==="mirror"?(state.player.hp>16?"touch-mirror":"break-mirror")
          :(state.player.gold>=5?"leave-offering":"take-ration");
      performAction(state,{type:"choose",choiceId:choice});continue;
    }
    if(state.overlay?.type==="shop"){
      const offers=state.overlay.stock.filter((offer)=>!offer.sold&&state.player.gold>=offer.cost&&state.player.inventory.length<12);
      const offer=offers.find((entry)=>entry.item.slot==="consumable")
        ||offers.find((entry)=>entry.item.slot==="weapon"&&entry.item.attack>state.player.attack-4)
        ||offers.find((entry)=>entry.item.slot==="armor")
        ||offers.find((entry)=>entry.item.slot==="charm");
      if(offer){performAction(state,{type:"buy",itemId:offer.item.id});continue;}
      performAction(state,{type:"close"});continue;
    }
    const boss=state.enemies.find((enemy)=>enemy.alive&&enemy.type===ENEMY_TYPES.BOSS);
    let target=boss;
    if(!target){
      const candidates=state.features.filter((feature)=>!feature.used&&(feature.type!=="shop"||!feature.visited)&&["treasure","shop","event"].includes(feature.type));
      let nearest=null; let nearestLength=Infinity;
      for(const feature of candidates){const path=findPath(state.map,state.player,feature);if(path.length>0&&path.length<nearestLength){nearest=feature;nearestLength=path.length;}}
      const stairPath=findPath(state.map,state.player,state.map.stairs);
      target=nearest&&nearestLength<stairPath.length+1?nearest:state.map.stairs;
    }
    const path=findPath(state.map,state.player,target);
    if(path.length<=1){
      if(boss){performAction(state,{type:"attack",targetId:boss.id});continue;}
      if(target.type){performAction(state,{type:"interact"});continue;}
      performAction(state,{type:"descend"});continue;
    }
    const next=path[1];
    performAction(state,{type:"move",dx:next.x-state.player.x,dy:next.y-state.player.y});
  }
  return {state,actions};
}

test("a deterministic prepared run can descend, fight the warden, and win",{timeout:10_000},()=>{
  const {state,actions}=playGreedyRun("bot-2");
  assert.equal(state.status,"victory");
  assert.equal(state.floor,4);
  assert.equal(state.bossDefeated,true);
  assert.ok(actions<700);
});

test("balance smoke sweep: a loot-seeking strategy can clear several seeded runs",{timeout:20_000},()=>{
  let wins=0;
  for(let index=0;index<12;index+=1){
    const {state}=playGreedyRun(`bot-${index}`);
    if(state.status==="victory")wins+=1;
  }
  assert.ok(wins>=4,`expected at least 4/12 wins from the reference strategy, got ${wins}/12`);
});
