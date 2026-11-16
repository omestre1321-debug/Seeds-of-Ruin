import test from "node:test";
import assert from "node:assert/strict";
import { ParticleSystem } from "../js/ui/particles.js";

test("particle pool never exceeds its cap and reuses allocated records",()=>{
  const system=new ParticleSystem({maxParticles:7});
  assert.equal(system.emit("enemyDeath",10,10,{count:100}),7);
  assert.equal(system.activeCount,7);
  assert.equal(system.pooledCount,7);
  for(let step=0;step<40;step+=1)system.update(.05);
  assert.equal(system.activeCount,0);
  assert.equal(system.emit("enemyDeath",20,20,{count:7}),7);
  assert.equal(system.pooledCount,7);
  system.emit("dropBurst",0,0,{count:1000});
  assert.equal(system.activeCount,7);
  assert.ok(system.pooledCount<=7);
});

test("reduced effects lowers decorative volume while preserving the cap",()=>{
  const full=new ParticleSystem({maxParticles:500});
  const reduced=new ParticleSystem({maxParticles:500,reducedMotion:true});
  const normalCount=full.emit("equipAura",0,0);
  const reducedCount=reduced.emit("equipAura",0,0);
  assert.ok(reducedCount>0&&reducedCount<normalCount);
  reduced.setReducedMotion(false);
  assert.equal(reduced.reducedMotion,false);
});
