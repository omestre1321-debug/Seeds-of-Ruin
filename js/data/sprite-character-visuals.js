const STANDARD_ANCHORS=Object.freeze({
  head:Object.freeze({x:16,y:9}),
  neck:Object.freeze({x:16,y:16}),
  mainHand:Object.freeze({x:25,y:21}),
  offHand:Object.freeze({x:7,y:21}),
  ringMain:Object.freeze({x:25,y:23}),
  ringOff:Object.freeze({x:7,y:23}),
  leftFoot:Object.freeze({x:12,y:34}),
  rightFoot:Object.freeze({x:21,y:34}),
});

const STANDARD_MASKS=Object.freeze({
  hair:Object.freeze([{x:8,y:4,width:16,height:6}]),
  skin:Object.freeze([{x:10,y:10,width:12,height:7},{x:5,y:17,width:5,height:8},{x:22,y:17,width:5,height:8}]),
  clothing:Object.freeze([{x:10,y:17,width:12,height:13}]),
  armor:Object.freeze([{x:7,y:15,width:18,height:16}]),
  boots:Object.freeze([{x:7,y:30,width:18,height:7}]),
  hands:Object.freeze([{x:4,y:19,width:6,height:7},{x:22,y:19,width:6,height:7}]),
});

export const PLAYER_BODY_VARIANTS=Object.freeze([
  Object.freeze({id:"delver-1",label:"Delver I",spriteId:"characters-r00-c02-p003",anchors:STANDARD_ANCHORS,masks:STANDARD_MASKS}),
  Object.freeze({id:"delver-2",label:"Delver II",spriteId:"characters-r00-c03-p004",anchors:STANDARD_ANCHORS,masks:STANDARD_MASKS}),
  Object.freeze({id:"delver-3",label:"Delver III",spriteId:"characters-r00-c04-p005",anchors:STANDARD_ANCHORS,masks:STANDARD_MASKS}),
  Object.freeze({id:"delver-4",label:"Delver IV",spriteId:"characters-r00-c05-p006",anchors:STANDARD_ANCHORS,masks:STANDARD_MASKS}),
  Object.freeze({id:"delver-5",label:"Delver V",spriteId:"characters-r00-c06-p007",anchors:STANDARD_ANCHORS,masks:STANDARD_MASKS}),
]);

export const DEFAULT_BODY_VARIANT=PLAYER_BODY_VARIANTS[0].id;
export function bodyVariantFor(id){return PLAYER_BODY_VARIANTS.find((body)=>body.id===id)??PLAYER_BODY_VARIANTS[0];}
export function bodyVariantForClass(classId){
  const index=classId==="wayfinder"?1:classId==="emberAdept"?2:0;
  return PLAYER_BODY_VARIANTS[index];
}

export const HAIR_STYLE_PIXELS=Object.freeze({
  cropped:Object.freeze({shadow:Object.freeze([[10,5,12,2]]),highlight:Object.freeze([[12,5,7,1]])}),
  coils:Object.freeze({shadow:Object.freeze([[8,5,5,3],[14,4,5,4],[20,5,4,3]]),highlight:Object.freeze([[10,5,2,1],[16,4,2,1],[21,5,2,1]])}),
  braided:Object.freeze({shadow:Object.freeze([[9,5,13,2],[22,7,3,11],[21,17,4,4]]),highlight:Object.freeze([[11,5,7,1],[23,9,1,6]])}),
  swept:Object.freeze({shadow:Object.freeze([[8,5,15,3],[8,8,3,4]]),highlight:Object.freeze([[10,5,9,1],[9,8,1,2]])}),
  hooded:Object.freeze({shadow:Object.freeze([[7,5,18,9],[8,10,16,3]]),highlight:Object.freeze([[9,5,13,1],[8,8,2,4]])}),
});

export const ARMOR_MATERIAL_COLORS=Object.freeze({
  leather:"#87573e",iron:"#838c88",steel:"#648a98",obsidian:"#66547b",giltsteel:"#b78b43",
});
export const ARMOR_PALETTES=Object.freeze({
  common:Object.freeze({color:"#966b4b",detail:"#d1a06e"}),
  uncommon:Object.freeze({color:"#888e8b",detail:"#d1c39d"}),
  rare:Object.freeze({color:"#698fa0",detail:"#c2e0df"}),
  epic:Object.freeze({color:"#765d91",detail:"#d4a5e4"}),
  legendary:Object.freeze({color:"#b8893f",detail:"#ffdd82"}),
});

export function armorPaletteForItem(item){
  const rarity=ARMOR_PALETTES[item?.rarity]??ARMOR_PALETTES.common;
  return {color:ARMOR_MATERIAL_COLORS[item?.material]??rarity.color,detail:rarity.detail};
}

export const HAND_PALETTES=Object.freeze({
  common:"#735647",uncommon:"#8b8775",rare:"#658c96",epic:"#745985",legendary:"#bd9451",
});
