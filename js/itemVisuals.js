// Original, grid-coordinate primitives. Add variants here; the renderer only interprets shape data.
const visual=(slot,form,primary,secondary,accent,glow,pieces)=>({slot,form,primary,secondary,accent,glow,pieces});
const rect=(x,y,w,h,color)=>({shape:"rect",x,y,w,h,color});
const poly=(points,color)=>({shape:"poly",points,color});
const line=(x1,y1,x2,y2,width,color)=>({shape:"line",x1,y1,x2,y2,width,color});
const circle=(x,y,r,color)=>({shape:"circle",x,y,r,color});

export const ITEM_VISUALS=Object.freeze({
  "weapon-starter-cleaver":visual("weapon","cleaver","#aab6ad","#54645d","#e0b96f",0,[rect(25,19,2,11,"secondary"),rect(22,15,7,5,"primary"),poly([[22,15],[28,15],[30,20],[22,20]],"accent")]),
  "weapon-starter-bow":visual("weapon","bow","#996942","#503c35","#9fd2b2",0,[line(25,14,28,20,2,"primary"),line(28,20,25,27,2,"primary"),line(25,14,25,27,1,"accent"),line(24,20,30,20,1,"secondary")]),
  "weapon-starter-rod":visual("weapon","rod","#624f72","#332b46","#d4aaff",.25,[line(26,14,26,29,2,"secondary"),line(25,18,27,18,2,"primary"),circle(26,13,3,"accent")]),
  "weapon-cinder-knife":visual("weapon","knife","#7e8b83","#454f4a","#c99765",0,[rect(25,20,2,9,"secondary"),poly([[22,20],[28,20],[27,15],[25,14]],"primary"),rect(23,20,5,2,"accent")]),
  "weapon-brass-saber":visual("weapon","saber","#c69053","#67513e","#f1d49a",.12,[line(25,27,29,15,2,"primary"),line(24,28,27,27,2,"secondary"),circle(29,15,1.5,"accent")]),
  "weapon-glass-pike":visual("weapon","pike","#80c5ca","#426b77","#c4fbeb",.35,[line(25,29,27,12,2,"secondary"),poly([[24,14],[28,9],[29,15]],"accent"),rect(24,22,4,2,"primary")]),
  "weapon-ember-glaive":visual("weapon","glaive","#d57a4f","#5a3940","#ffd277",.55,[line(25,29,27,13,2,"secondary"),poly([[24,15],[25,9],[30,12],[27,16]],"primary"),circle(28,12,1.5,"accent")]),
  "weapon-sunshard":visual("weapon","sunshard","#f0c66c","#805146","#fff0ad",.8,[line(25,29,27,13,2,"secondary"),poly([[24,14],[26,7],[29,12],[28,16]],"accent"),circle(27,11,2,"primary")]),
  "armor-leather":visual("armor","leather","#85533e","#493938","#bd8a57",0,[poly([[10,18],[22,18],[24,27],[9,27]],"primary"),rect(11,20,12,2,"secondary"),circle(20,23,1,"accent")]),
  "armor-brigandine":visual("armor","brigandine","#8f7560","#4e4d48","#d5ad68",.08,[poly([[9,18],[23,18],[24,28],[8,28]],"primary"),rect(10,20,12,2,"secondary"),circle(12,23,1,"accent"),circle(20,23,1,"accent")]),
  "armor-iron":visual("armor","iron","#84948f","#3d504c","#c7d1bf",.14,[poly([[9,17],[23,17],[25,27],[8,27]],"primary"),rect(11,19,10,3,"secondary"),rect(14,23,5,3,"accent"),line(10,18,22,18,1,"accent")]),
  "armor-obsidian":visual("armor","obsidian","#564a62","#2b3340","#a88cda",.38,[poly([[9,17],[23,17],[25,27],[8,27]],"secondary"),rect(11,18,10,4,"primary"),poly([[15,20],[17,22],[15,24],[13,22]],"accent"),line(10,26,22,26,1,"accent")]),
  "armor-legendary":visual("armor","emberplate","#c8774f","#563747","#ffd07a",.72,[poly([[8,17],[24,17],[25,27],[7,27]],"secondary"),rect(10,18,12,5,"primary"),poly([[16,19],[19,22],[16,25],[13,22]],"accent"),line(9,26,23,26,1,"accent")]),
  "helmet-cloth":visual("helmet","cowl","#475d50","#293b36","#98b69b",0,[poly([[10,12],[12,6],[20,6],[23,12],[22,17],[11,17]],"primary"),rect(11,13,12,2,"secondary")]),
  "helmet-iron":visual("helmet","visor","#87958b","#3c4a45","#d1bb81",.12,[poly([[10,12],[11,6],[21,6],[23,12],[22,17],[10,17]],"primary"),rect(11,12,12,3,"secondary"),rect(13,13,2,1,"accent"),rect(19,13,2,1,"accent")]),
  "helmet-ember":visual("helmet","emberhood","#795c7a","#43384d","#f2a969",.5,[poly([[8,13],[10,5],[21,4],[25,12],[23,18],[10,18]],"secondary"),rect(11,12,12,3,"primary"),poly([[14,14],[18,14],[16,17]],"accent")]),
  "boots-leather":visual("boots","boots","#704738","#3d302d","#b98052",0,[rect(9,29,5,5,"primary"),rect(18,29,5,5,"primary"),rect(8,33,7,2,"secondary"),rect(17,33,7,2,"secondary"),rect(10,30,3,1,"accent"),rect(19,30,3,1,"accent")]),
  "boots-iron":visual("boots","greaves","#89928b","#424d4a","#d6ba7d",.12,[rect(9,28,5,6,"primary"),rect(18,28,5,6,"primary"),rect(8,33,7,2,"secondary"),rect(17,33,7,2,"secondary"),rect(10,30,3,1,"accent"),rect(19,30,3,1,"accent")]),
  "boots-ashglass":visual("boots","ashglass","#70abb2","#354f5a","#baf3dc",.5,[rect(9,28,5,6,"primary"),rect(18,28,5,6,"primary"),poly([[9,30],[12,29],[14,32],[11,33]],"accent"),poly([[18,30],[21,29],[23,32],[20,33]],"accent")]),
  "ring-copper":visual("ring","ring","#b67d4d","#56443a","#eed08c",.08,[circle(17,24,2,"accent")]),
  "ring-glass":visual("ring","ring","#7ec4d7","#345365","#d6f6ef",.55,[circle(17,24,2.3,"accent"),circle(17,24,1,"primary")]),
  "amulet-stone":visual("amulet","amulet","#748a74","#3a4f47","#e3bd6e",.1,[line(15,17,16,21,1,"secondary"),circle(16,22,2,"accent")]),
  "amulet-ember":visual("amulet","amulet","#d77e55","#623d46","#ffe19a",.6,[line(15,17,16,21,1,"secondary"),poly([[16,20],[19,23],[16,26],[13,23]],"accent")]),
});

export const VISUAL_BY_RARITY=Object.freeze({
  weapon:{common:"weapon-cinder-knife",uncommon:"weapon-brass-saber",rare:"weapon-glass-pike",epic:"weapon-ember-glaive",legendary:"weapon-sunshard"},
  armor:{common:"armor-leather",uncommon:"armor-brigandine",rare:"armor-iron",epic:"armor-obsidian",legendary:"armor-legendary"},
  helmet:{common:"helmet-cloth",uncommon:"helmet-cloth",rare:"helmet-iron",epic:"helmet-ember",legendary:"helmet-ember"},
  boots:{common:"boots-leather",uncommon:"boots-leather",rare:"boots-iron",epic:"boots-ashglass",legendary:"boots-ashglass"},
  ring:{common:"ring-copper",uncommon:"ring-copper",rare:"ring-glass",epic:"ring-glass",legendary:"ring-glass"},
  amulet:{common:"amulet-stone",uncommon:"amulet-stone",rare:"amulet-ember",epic:"amulet-ember",legendary:"amulet-ember"},
});

export function visualForItem(item){
  if(item?.visualId&&ITEM_VISUALS[item.visualId])return ITEM_VISUALS[item.visualId];
  const id=VISUAL_BY_RARITY[item?.slot]?.[item?.rarity]??VISUAL_BY_RARITY[item?.slot]?.common;
  return ITEM_VISUALS[id]??null;
}
