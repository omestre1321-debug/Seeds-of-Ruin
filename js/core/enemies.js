import { findPath } from "./pathfinding.js";
import { isWalkable } from "./map/flood-fill.js";
import { getMonsterDefinition } from "../data/monsters.js";

export const ENEMY_TYPES = Object.freeze({
  SENTRY:"ashen-sentry",WOLF:"ember-wolf",WRAITH:"mourning-wraith",BOSS:"vault-warden",
  RAT:"moss-rat",GOBLIN:"goblin-scrapper",SKELETON:"crypt-skeleton",MUMMY:"crypt-mummy",
  BAT:"cinder-bat",SPIDER:"ember-spider",IMP:"forge-imp",SLIME:"vault-slime",SERPENT:"ash-serpent",
});

export function createEnemy(type,id,position,floor,room=null,{elite=false,spawnBiome=null}={}){
  const definition=getMonsterDefinition(type);
  if(!definition)throw new RangeError(`Unknown enemy type: ${type}`);
  const boss=definition.boss===true;
  const scaling=Math.max(0,floor-definition.floorMin);
  const eliteMultiplier=elite&&!boss?1.35:1;
  const maxHp=Math.round((definition.hp+scaling*(boss?6:2))*eliteMultiplier);
  return {
    id,type,name:elite?`Elite ${definition.name}`:definition.name,
    x:position.x,y:position.y,hp:maxHp,maxHp,
    attack:Math.max(1,Math.round((definition.attack+scaling)* (elite&&!boss?1.2:1))),
    defense:definition.defense+(boss?Math.floor(scaling/3):0)+(elite&&!boss?1:0),
    crit:Math.min(.4,definition.crit+scaling*.01+(elite ? .025 : 0)),
    xp:definition.xp+scaling*3,gold:definition.gold+scaling*2,
    behavior:definition.behavior,family:definition.family,spriteId:definition.spriteId,
    spriteCategory:definition.spriteCategory,elite:Boolean(elite&&!boss),eliteTint:definition.eliteTint,
    isBoss:boss,spawnBiome,
    facing:position.x%2===0?"left":"right",
    home:room?{x:room.x,y:room.y,width:room.width,height:room.height}:null,
    patrolIndex:0,alive:true,
  };
}

function occupiedByOther(state,x,y,enemy){
  if(state.player.x===x&&state.player.y===y)return true;
  return state.enemies.some((other)=>other.alive&&other.id!==enemy.id&&other.x===x&&other.y===y);
}

function nextPathStep(state,enemy){
  const path=findPath(state.map,{x:enemy.x,y:enemy.y},{x:state.player.x,y:state.player.y});
  if(path.length>1){const next=path[1];if(!occupiedByOther(state,next.x,next.y,enemy))return{type:"move",x:next.x,y:next.y};}
  return{type:"wait"};
}

function neighborCells(state,enemy){
  const candidates=[{x:enemy.x,y:enemy.y-1},{x:enemy.x+1,y:enemy.y},{x:enemy.x,y:enemy.y+1},{x:enemy.x-1,y:enemy.y}];
  return candidates.filter((cell)=>isWalkable(state.map,cell.x,cell.y)&&!occupiedByOther(state,cell.x,cell.y,enemy));
}

/** One deterministic AI intent. Visual sprite/elite metadata is never used for decisions. */
export function chooseEnemyAction(state,enemy,rng){
  const distance=Math.abs(enemy.x-state.player.x)+Math.abs(enemy.y-state.player.y);
  if(distance===1)return{type:"attack"};
  if(enemy.behavior==="flee"&&enemy.hp<=enemy.maxHp*.45&&distance<=5){
    const safe=neighborCells(state,enemy);
    if(safe.length>0){
      safe.sort((a,b)=>(Math.abs(b.x-state.player.x)+Math.abs(b.y-state.player.y))-(Math.abs(a.x-state.player.x)+Math.abs(a.y-state.player.y))||a.y-b.y||a.x-b.x);
      const bestDistance=Math.abs(safe[0].x-state.player.x)+Math.abs(safe[0].y-state.player.y);
      const best=safe.filter((cell)=>Math.abs(cell.x-state.player.x)+Math.abs(cell.y-state.player.y)===bestDistance);
      const choice=rng.pick(best);return{type:"move",x:choice.x,y:choice.y,behavior:"flee"};
    }
  }
  const aggroRange=enemy.behavior==="boss"?Infinity:enemy.behavior==="hound"?10:enemy.behavior==="skittish"?5:6;
  if(distance<=aggroRange)return nextPathStep(state,enemy);
  const home=enemy.home;
  const patrol=neighborCells(state,enemy).filter((cell)=>!home||(cell.x>=home.x&&cell.x<home.x+home.width&&cell.y>=home.y&&cell.y<home.y+home.height));
  if(patrol.length===0||rng.chance(enemy.behavior==="skittish" ? .45 : .25))return{type:"wait"};
  const step=rng.pick(patrol);return{type:"move",x:step.x,y:step.y,behavior:"patrol"};
}
