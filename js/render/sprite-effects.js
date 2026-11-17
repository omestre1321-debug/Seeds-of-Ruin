import { effectDefinition } from "../data/effect-sprites.js";

const MAX_SPRITE_EFFECTS=120;

/** Finite sprite effects live beside particles in the presentation layer only. */
export class SpriteEffectRenderer{
  constructor({spriteAtlas,maxEffects=MAX_SPRITE_EFFECTS}={}){this.spriteAtlas=spriteAtlas;this.maxEffects=Math.max(1,Math.min(MAX_SPRITE_EFFECTS,Math.floor(maxEffects)));this.active=[];this.serial=0;}
  emit(name,{x,y,tileX,tileY,rotation=null,scale=null,color=null}={},timestamp=0){
    const definition=effectDefinition(name);if(!definition||definition.duration<=0)return false;
    if(this.active.length>=this.maxEffects)this.active.shift();
    this.active.push({id:`sprite-effect-${++this.serial}`,name,spriteId:definition.spriteId,category:definition.category,
      x,y,tileX,tileY,rotation:rotation??definition.rotation,scale:scale??definition.scale,color,
      startedAt:Number(timestamp)||0,duration:definition.duration,decorative:definition.decorative});
    return true;
  }
  draw(context,state,layout,timestamp=0,reducedEffects=false){
    if(!this.spriteAtlas||!state?.map||!layout)return;
    const time=Number(timestamp)||0;this.active=this.active.filter((effect)=>time-effect.startedAt<effect.duration);
    const {map}=state;const tile=layout.tileSize;
    context.save();context.beginPath();
    for(let y=0;y<map.height;y++)for(let x=0;x<map.width;x++)if(state.visible?.[y*map.width+x]===1)context.rect(layout.offsetX+x*tile,layout.offsetY+y*tile,tile,tile);
    context.clip();
    for(const effect of this.active){
      if(reducedEffects&&effect.decorative)continue;
      if(!Number.isFinite(effect.x)||!Number.isFinite(effect.y)||state.visible?.[effect.tileY*map.width+effect.tileX]!==1)continue;
      const sprite=this.spriteAtlas.getSprite(effect.spriteId);
      const progress=Math.max(0,Math.min(1,(time-effect.startedAt)/effect.duration));
      const alpha=(reducedEffects ? .55 : 1)*(1-progress)*.92;
      const scale=Number.isInteger(effect.scale)&&effect.scale>=1&&effect.scale<=4?effect.scale:1;
      const width=(sprite?.width??16)*scale;const height=(sprite?.height??16)*scale;
      if(!sprite){this.spriteAtlas.draw(context,effect.spriteId,Math.round(effect.x-width/2),Math.round(effect.y-height/2),{scale,width,height,alpha});continue;}
      context.save();context.translate(Math.round(effect.x),Math.round(effect.y));context.rotate(effect.rotation+progress*(effect.name==="slash" ? .45 : .12));
      if(effect.color){context.globalCompositeOperation="lighter";context.globalAlpha=alpha*.35;context.fillStyle=effect.color;context.beginPath();context.arc(0,0,Math.max(width,height)*.3,0,Math.PI*2);context.fill();}
      this.spriteAtlas.draw(context,effect.spriteId,-Math.round(width/2),-Math.round(height/2),{scale,width,height,alpha});
      context.restore();
    }
    context.restore();
  }
  clear(){this.active.length=0;}
}
