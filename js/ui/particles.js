import { PARTICLE_PRESETS } from "./particle-presets.js";

const HARD_CAP=500;
function randomBetween(range){return range[0]+Math.random()*(range[1]-range[0]);}

/** Canvas-side visual effect pool. It never reads or mutates the game state. */
export class ParticleSystem{
  constructor({maxParticles=HARD_CAP,reducedMotion=false}={}){
    this.maxParticles=Math.max(1,Math.min(HARD_CAP,Math.floor(maxParticles)));
    this.reducedMotion=Boolean(reducedMotion);
    this.active=[];
    this.free=[];
    this.allocated=0;
  }

  get activeCount(){return this.active.length;}
  get pooledCount(){return this.allocated;}
  setReducedMotion(value){this.reducedMotion=Boolean(value);}

  emit(presetName,x,y,options={}){
    const preset=PARTICLE_PRESETS[presetName];
    if(!preset)throw new RangeError(`Unknown particle preset: ${presetName}`);
    let count=Math.max(0,Math.floor(options.count??preset.count));
    count=Math.floor(count*Math.max(0,options.intensity??1));
    if(this.reducedMotion){
      if(preset.decorative&&count<=1)return 0;
      count=Math.max(1,Math.floor(count*.32));
    }
    let emitted=0;
    for(let index=0;index<count;index+=1){
      if(this.active.length>=this.maxParticles)break;
      let particle=this.free.pop();
      if(!particle&&this.allocated<this.maxParticles){particle={};this.allocated+=1;}
      if(!particle)break;
      const angle=(options.angle??Math.random()*preset.spread)-preset.spread/2;
      const speed=randomBetween(preset.speed);
      const life=randomBetween(preset.life);
      Object.assign(particle,{
        x:x+randomBetween(options.offsetX??[-2,2]),y:y+randomBetween(options.offsetY??[-2,2]),
        vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed,
        life,maxLife:life,color:options.color??preset.color??"#d9ad69",
        size:randomBetween(preset.size),initialSize:0,shape:preset.shape,
        gravity:preset.gravity,drag:preset.drag,glow:preset.glow??0,
        spin:(Math.random()-.5)*4,rotation:Math.random()*Math.PI*2,
        shrink:preset.shrink??1,blend:preset.blend===true,
        followX:Number.isFinite(options.targetX)?options.targetX:null,
        followY:Number.isFinite(options.targetY)?options.targetY:null,
        followStrength:preset.follow??0,
        worldBound:options.worldBound===true,
        tileX:options.tileX,tileY:options.tileY,
      });
      particle.initialSize=particle.size;
      this.active.push(particle);emitted+=1;
    }
    return emitted;
  }

  update(deltaSeconds){
    const dt=Math.max(0,Math.min(.05,Number(deltaSeconds)||0));
    let index=0;
    while(index<this.active.length){
      const particle=this.active[index];
      particle.life-=dt;
      if(particle.life<=0){
        const last=this.active.pop();
        if(index<this.active.length)this.active[index]=last;
        this.free.push(particle);
        continue;
      }
      if(particle.followX!==null){
        particle.vx+=(particle.followX-particle.x)*particle.followStrength*dt*8;
        particle.vy+=(particle.followY-particle.y)*particle.followStrength*dt*8;
      }
      const friction=Math.exp(-particle.drag*dt);
      particle.vx*=friction;particle.vy=(particle.vy+particle.gravity*dt)*friction;
      particle.x+=particle.vx*dt;particle.y+=particle.vy*dt;particle.rotation+=particle.spin*dt;
      particle.size=Math.max(.15,particle.initialSize*Math.pow(particle.life/particle.maxLife,particle.shrink));
      index+=1;
    }
  }

  draw(context,{isVisible}={}){
    const originalComposite=context.globalCompositeOperation;
    for(const particle of this.active){
      if(particle.worldBound&&isVisible&&!isVisible(particle.tileX,particle.tileY))continue;
      context.save();
      context.globalAlpha=Math.max(0,Math.min(1,particle.life/particle.maxLife));
      context.globalCompositeOperation=particle.blend?"lighter":"source-over";
      if(particle.glow>0){context.shadowColor=particle.color;context.shadowBlur=particle.glow*7;}
      context.fillStyle=particle.color;
      const size=particle.size;
      if(particle.shape==="circle"){
        context.beginPath();context.arc(particle.x,particle.y,size,0,Math.PI*2);context.fill();
      }else if(particle.shape==="diamond"){
        context.translate(particle.x,particle.y);context.rotate(particle.rotation);context.fillRect(-size/2,-size/2,size,size);
      }else if(particle.shape==="spark"){
        context.translate(particle.x,particle.y);context.rotate(particle.rotation);context.fillRect(-size*.35,-size,size*.7,size*2);
      }else context.fillRect(particle.x-size/2,particle.y-size/2,size,size);
      context.restore();
    }
    context.globalCompositeOperation=originalComposite;
  }

  clear(){
    while(this.active.length)this.free.push(this.active.pop());
  }
}
