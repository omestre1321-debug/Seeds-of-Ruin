export const MONSTERS=Object.freeze({
  "ashen-sentry":Object.freeze({id:"ashen-sentry",name:"Ashen Sentry",family:"bandit",hp:10,attack:3,defense:0,crit:.03,xp:8,gold:3,behavior:"sentry",spriteId:"characters-r00-c03-p004",spriteCategory:"player_body",floorMin:1,biomes:["stone","foundry"],eliteTint:"#db8f55"}),
  "ember-wolf":Object.freeze({id:"ember-wolf",name:"Cinder Wolf",family:"beast",hp:8,attack:3,defense:0,crit:.08,xp:10,gold:4,behavior:"hound",spriteId:"characters-r01-c04-p011",spriteCategory:"monster_beast",floorMin:1,biomes:["stone","lava"],eliteTint:"#e86e46"}),
  "mourning-wraith":Object.freeze({id:"mourning-wraith",name:"Mourning Wraith",family:"ghost",hp:7,attack:3,defense:0,crit:.06,xp:11,gold:5,behavior:"flee",spriteId:"characters-r07-c00",spriteCategory:"monster_ghost",floorMin:2,biomes:["crypt","foundry"],eliteTint:"#95e6eb"}),
  "vault-warden":Object.freeze({id:"vault-warden",name:"The Vault Warden",family:"boss",hp:22,attack:5,defense:1,crit:.08,xp:55,gold:30,behavior:"boss",spriteId:"characters-r05-c06",spriteCategory:"monster_elemental",floorMin:4,biomes:["lava","sanctum"],eliteTint:"#ffd073",boss:true}),
  "moss-rat":Object.freeze({id:"moss-rat",name:"Moss Rat",family:"beast",hp:6,attack:2,defense:0,crit:.04,xp:5,gold:2,behavior:"skittish",spriteId:"characters-r01-c02-p008",spriteCategory:"monster_beast",floorMin:1,biomes:["stone","crypt"],eliteTint:"#b2d477"}),
  "goblin-scrapper":Object.freeze({id:"goblin-scrapper",name:"Goblin Scrapper",family:"goblin",hp:9,attack:3,defense:0,crit:.05,xp:8,gold:3,behavior:"sentry",spriteId:"characters-r02-c00-p016",spriteCategory:"monster_goblin",floorMin:1,biomes:["stone","foundry"],eliteTint:"#d1c248"}),
  "crypt-skeleton":Object.freeze({id:"crypt-skeleton",name:"Crypt Skeleton",family:"undead",hp:10,attack:4,defense:1,crit:.04,xp:10,gold:4,behavior:"sentry",spriteId:"characters-r06-c00",spriteCategory:"monster_skeleton",floorMin:2,biomes:["crypt"],eliteTint:"#d8d2b5"}),
  "crypt-mummy":Object.freeze({id:"crypt-mummy",name:"Shroud Mummy",family:"undead",hp:12,attack:4,defense:1,crit:.03,xp:12,gold:5,behavior:"sentry",spriteId:"characters-r06-c04",spriteCategory:"monster_mummy",floorMin:2,biomes:["crypt"],eliteTint:"#cfab77"}),
  "cinder-bat":Object.freeze({id:"cinder-bat",name:"Cinder Bat",family:"beast",hp:6,attack:3,defense:0,crit:.1,xp:7,gold:3,behavior:"hound",spriteId:"characters-r04-c04",spriteCategory:"monster_bat",floorMin:2,biomes:["crypt","foundry"],eliteTint:"#ba76dc"}),
  "ember-spider":Object.freeze({id:"ember-spider",name:"Ember Spider",family:"arachnid",hp:9,attack:4,defense:0,crit:.06,xp:10,gold:4,behavior:"hound",spriteId:"characters-r04-c00",spriteCategory:"monster_spider",floorMin:3,biomes:["foundry","lava"],eliteTint:"#ef765c"}),
  "forge-imp":Object.freeze({id:"forge-imp",name:"Forge Imp",family:"demon",hp:11,attack:5,defense:1,crit:.08,xp:13,gold:5,behavior:"sentry",spriteId:"characters-r05-c00",spriteCategory:"monster_elemental",floorMin:3,biomes:["foundry","lava"],eliteTint:"#74d5d0"}),
  "vault-slime":Object.freeze({id:"vault-slime",name:"Vault Slime",family:"slime",hp:8,attack:3,defense:0,crit:.02,xp:7,gold:2,behavior:"skittish",spriteId:"characters-r08-c00",spriteCategory:"monster_slime",floorMin:1,biomes:["stone","crypt","lava"],eliteTint:"#9de277"}),
  "ash-serpent":Object.freeze({id:"ash-serpent",name:"Ash Serpent",family:"reptile",hp:10,attack:4,defense:0,crit:.07,xp:11,gold:4,behavior:"hound",spriteId:"characters-r07-c04",spriteCategory:"monster_reptile",floorMin:3,biomes:["foundry","lava"],eliteTint:"#77c9a1"}),
});

export const MONSTERS_BY_BIOME=Object.freeze({
  stone:Object.freeze(["moss-rat","vault-slime","goblin-scrapper","ashen-sentry","ember-wolf"]),
  crypt:Object.freeze(["moss-rat","crypt-skeleton","crypt-mummy","mourning-wraith","cinder-bat","vault-slime"]),
  foundry:Object.freeze(["ashen-sentry","goblin-scrapper","cinder-bat","ember-spider","forge-imp","mourning-wraith"]),
  lava:Object.freeze(["ember-wolf","ember-spider","forge-imp","ash-serpent","vault-slime"]),
});

export function getMonsterDefinition(type){return MONSTERS[type]??null;}
