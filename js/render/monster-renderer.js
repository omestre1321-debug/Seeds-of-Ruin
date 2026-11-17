import { effectDefinition } from "../data/effect-sprites.js";

function hexToHue(hex){
  const value=Number.parseInt(String(hex??"#ffffff").slice(1),16);const r=((value>>16)&255)/255;const g=((value>>8)&255)/255;const b=(value&255)/255;
  const max=Math.max(r,g,b);const min=Math.min(r,g,b);const delta=max-min;let hue=0;
  if(delta===0)hue=0;else if(max===r)hue=60*(((g-b)/delta)%6);else if(max===g)hue=60*((b-r)/delta+2);else hue=60*((r-g)/delta+4);
  return (hue+360)%360;
}

function isVisible(state,enemy){return state.visible?.[enemy.y*state.map.width+enemy.x]===1;}
function localPoint(enemy,layout,tile){return{x:layout.offsetX+(enemy.x+.5)*tile,y:layout.offsetY+(enemy.y+.5)*tile};}

export function drawMonsterSprite(context,enemy,point,tileSize,spriteAtlas,{time=0,flash=0,death=0,reducedEffects=false}={}){
  const sprite=spriteAtlas?.getSprite(enemy.spriteId);
  const baseScale=enemy.isBoss?2:tileSize>=30?2:1;
  const rawWidth=(sprite?.width??16)*baseScale;const rawHeight=(sprite?.height??16)*baseScale;
  const pulse=reducedEffects?0:Math.sin(time*.012+enemy.x*1.4+enemy.y*.8);
  const squash=enemy.isBoss?0:pulse;
  const width=Math.max(1,Math.round(rawWidth*(1+squash*.035)));
  const height=Math.max(1,Math.round(rawHeight*(1-squash*.035)));
  const fallen=death>0;
  const x=Math.round(point.x-width/2);const y=Math.round(point.y-height/2+(reducedEffects?0:Math.sin(time*.006+enemy.x)*1.2));
  context.save();context.imageSmoothingEnabled=false;
  if(enemy.elite||enemy.isBoss){const hue=hexToHue(enemy.eliteTint);context.filter=`saturate(${enemy.isBoss?1.8:1.5}) hue-rotate(${Math.round(hue)}deg)`;}
  if(fallen){context.globalAlpha=Math.max(0,1-death);context.translate(point.x,point.y);context.rotate(-death*.9);context.translate(-point.x,-point.y);}
  if(enemy.elite&& !reducedEffects){context.save();context.globalCompositeOperation="lighter";context.globalAlpha=.14;context.fillStyle=enemy.eliteTint;context.beginPath();context.ellipse(point.x,point.y,width*.47,height*.48,0,0,Math.PI*2);context.fill();context.restore();}
  if(enemy.isBoss){context.save();context.globalCompositeOperation="lighter";context.globalAlpha=reducedEffects ? .13 : .2+(pulse+1)*.05;context.fillStyle=enemy.eliteTint;context.beginPath();context.ellipse(point.x,point.y,width*.52,height*.52,0,0,Math.PI*2);context.fill();context.restore();}
  spriteAtlas?.draw(context,enemy.spriteId,x,y,{scale:baseScale,flipX:enemy.facing==="left",width,height,alpha:fallen?Math.max(0,1-death):1});
  if(flash>0&&!reducedEffects){context.save();context.filter="brightness(3) grayscale(1)";spriteAtlas?.draw(context,enemy.spriteId,x,y,{scale:baseScale,flipX:enemy.facing==="left",width,height,alpha:Math.min(.85,flash)});context.restore();}
  context.restore();
  if(!fallen&&tileSize>=8){
    const barWidth=Math.max(8,Math.min(tileSize*.9,width*.74));const barHeight=Math.max(2,Math.round(tileSize*.1));const bx=Math.round(point.x-barWidth/2);const by=Math.round(point.y+height*.42+2);
    context.fillStyle="#101315";context.fillRect(bx,by,barWidth,barHeight);
    context.fillStyle=enemy.elite?enemy.eliteTint:"#e27667";context.fillRect(bx,by,barWidth*Math.max(0,enemy.hp/enemy.maxHp),barHeight);
  }
  return {x,y,width,height};
}

function drawEmoteSprite(context,spriteAtlas,name,x,y,size){
  const definition=effectDefinition(name);if(!definition)return;
  const sprite=spriteAtlas.getSprite(definition.spriteId);const width=sprite?.width??28;const height=sprite?.height??23;
  const left=Math.round(x-width/2);const top=Math.round(y-size*.72-height/2);
  spriteAtlas.draw(context,definition.spriteId,left,top,{scale:1});
  if(name==="emoteLost"){
    context.save();context.fillStyle="#2b3940";context.font="bold 10px ui-monospace,monospace";context.textAlign="center";context.textBaseline="middle";context.fillText("?",x,top+height*.42);context.restore();
  }
}

/** Per-run visual animator. State lives in UI, never in combat/RNG. */
export class MonsterRenderer{
  constructor({spriteAtlas,deathDuration=420}={}){this.spriteAtlas=spriteAtlas;this.deathDuration=deathDuration;this.states=new Map();}
  stateFor(enemy,time,state){
    let visual=this.states.get(enemy.id);
    if(!visual){visual={hp:enemy.hp,alive:enemy.alive,flashUntil:0,deathAt:null,alerted:false,noticeUntil:0,lostUntil:0};this.states.set(enemy.id,visual);}
    if(enemy.hp<visual.hp)visual.flashUntil=time+170;
    if(visual.alive&&!enemy.alive)visual.deathAt=time;
    const distance=Math.abs(enemy.x-state.player.x)+Math.abs(enemy.y-state.player.y);
    const aggro=enemy.behavior==="boss"?Infinity:enemy.behavior==="hound"?10:enemy.behavior==="skittish"?5:6;
    const alerted=enemy.alive&&distance<=aggro;
    if(alerted&&!visual.alerted)visual.noticeUntil=time+580;
    if(!alerted&&visual.alerted)visual.lostUntil=time+680;
    visual.alerted=alerted;visual.hp=enemy.hp;visual.alive=enemy.alive;
    return visual;
  }
  draw(context,state,layout,timestamp=0,{reducedEffects=false}={}){
    if(!state?.map||!layout||!this.spriteAtlas)return;
    const time=Number(timestamp)||0;const {map}=state;const tile=layout.tileSize;
    context.save();context.beginPath();
    for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++)if(state.visible?.[y*map.width+x]===1)context.rect(layout.offsetX+x*tile,layout.offsetY+y*tile,tile,tile);
    context.clip();
    for(const enemy of state.enemies??[]){
      const visible=isVisible(state,enemy);const visual=this.stateFor(enemy,time,state);
      if(enemy.alive&&!visible)continue;
      if(!enemy.alive){
        if(visual.deathAt===null||time-visual.deathAt>=this.deathDuration||!visible)continue;
        drawMonsterSprite(context,enemy,localPoint(enemy,layout,tile),tile,this.spriteAtlas,{time,death:(time-visual.deathAt)/this.deathDuration,reducedEffects});
        continue;
      }
      const point=localPoint(enemy,layout,tile);const flash=visual.flashUntil>time?Math.max(0,(visual.flashUntil-time)/170):0;
      drawMonsterSprite(context,enemy,point,tile,this.spriteAtlas,{time,flash,reducedEffects});
      if(enemy.elite){const status=effectDefinition("status");const icon=this.spriteAtlas.getSprite(status.spriteId);if(icon)this.spriteAtlas.draw(context,status.spriteId,Math.round(point.x+tile*.3),Math.round(point.y-tile*.55),{scale:1});}
      if(!reducedEffects){
        if(visual.noticeUntil>time)drawEmoteSprite(context,this.spriteAtlas,"emoteAlert",point.x,point.y-tile*.72,tile);
        else if(visual.lostUntil>time)drawEmoteSprite(context,this.spriteAtlas,"emoteLost",point.x,point.y-tile*.72,tile);
        else if(enemy.behavior==="sentry"&&Math.sin(time*.001+enemy.x*2.1)>0.25)drawEmoteSprite(context,this.spriteAtlas,"emoteSleep",point.x,point.y-tile*.68,tile);
      }
    }
    context.restore();
  }
  clear(){this.states.clear();}
}
