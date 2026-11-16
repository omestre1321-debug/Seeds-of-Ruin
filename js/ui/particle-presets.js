// Data-only presets consumed by ParticleSystem.emit(); effects stay outside turn logic.
export const PARTICLE_PRESETS=Object.freeze({
  dropSpark:{count:2,life:[.22,.5],speed:[8,24],size:[1.3,2.8],shape:"spark",gravity:-3,drag:1.8,glow:.45,decorative:true,spread:Math.PI*2},
  dropBurst:{count:16,life:[.3,.8],speed:[18,66],size:[1.5,3.8],shape:"spark",gravity:20,drag:1.2,glow:.7,spread:Math.PI*2},
  pickup:{count:11,life:[.35,.75],speed:[22,60],size:[1.6,3],shape:"circle",gravity:-18,drag:1.1,glow:.55,follow:.8,spread:Math.PI*2},
  equipAura:{count:22,life:[.3,.72],speed:[9,36],size:[1.7,3.8],shape:"diamond",gravity:-9,drag:1.4,glow:.85,spread:Math.PI*2},
  combatHit:{count:9,life:[.12,.35],speed:[24,92],size:[1,2.7],shape:"spark",gravity:22,drag:2.1,glow:.3,spread:Math.PI*2},
  enemyDeath:{count:20,life:[.32,.9],speed:[18,84],size:[1.4,3.5],shape:"circle",gravity:28,drag:1.6,glow:.5,spread:Math.PI*2},
  ambientEmber:{count:1,life:[1.5,3.4],speed:[3,12],size:[1,2.4],shape:"circle",gravity:-4,drag:.35,glow:.28,decorative:true,spread:Math.PI*.3},
  dustMote:{count:1,life:[.9,2.2],speed:[2,8],size:[.8,1.6],shape:"circle",gravity:-1,drag:.45,glow:.12,decorative:true,spread:Math.PI*2},
  torchSpark:{count:2,life:[.18,.55],speed:[8,26],size:[1,2.1],shape:"spark",gravity:-8,drag:.6,glow:.48,decorative:true,spread:Math.PI*.65},
  lavaEmber:{count:2,life:[.5,1.4],speed:[5,18],size:[1.2,2.5],shape:"circle",gravity:-10,drag:.35,glow:.62,decorative:true,spread:Math.PI*.5},
  waterBubble:{count:1,life:[.55,1.1],speed:[2,7],size:[1,2.4],shape:"circle",gravity:-15,drag:.3,glow:.3,decorative:true,spread:Math.PI*.35},
  foundrySpark:{count:2,life:[.12,.4],speed:[16,45],size:[1,2],shape:"spark",gravity:15,drag:1,glow:.46,decorative:true,spread:Math.PI*1.2},
  stairSpiral:{count:2,life:[.55,1.1],speed:[5,18],size:[1.5,3],shape:"diamond",gravity:-5,drag:.45,glow:.55,decorative:true,spread:Math.PI*1.4},
});
