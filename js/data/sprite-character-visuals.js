// Equipment anchors/masks use the original 32x40 procedural player silhouette.
export const PLAYER_ANCHORS=Object.freeze({
  head:Object.freeze({x:16,y:11}),neck:Object.freeze({x:16,y:19}),
  mainHand:Object.freeze({x:24,y:22}),offHand:Object.freeze({x:8,y:22}),
  ringMain:Object.freeze({x:23,y:23}),ringOff:Object.freeze({x:9,y:23}),
  leftFoot:Object.freeze({x:12,y:34}),rightFoot:Object.freeze({x:20,y:34}),
});
export const PLAYER_PALETTE_MASKS=Object.freeze({
  hair:Object.freeze([{x:9,y:4,width:15,height:9}]),
  armor:Object.freeze([{x:11,y:17,width:11,height:10},{x:12,y:27,width:9,height:5}]),
  boots:Object.freeze([{x:8,y:29,width:7,height:6},{x:17,y:29,width:7,height:6}]),
  hands:Object.freeze([{x:9,y:18,width:4,height:7},{x:19,y:18,width:4,height:7}]),
});
export const HAIR_STYLE_PIXELS=Object.freeze({
  cropped:Object.freeze({shadow:Object.freeze([[12,5,10,4]]),highlight:Object.freeze([[14,5,6,1]])}),
  coils:Object.freeze({shadow:Object.freeze([[11,6,12,4],[12,4,2,3],[16,4,2,3],[20,4,2,3],[22,5,2,3]]),highlight:Object.freeze([[14,6,5,1],[19,5,2,1]])}),
  braided:Object.freeze({shadow:Object.freeze([[11,5,11,4],[21,8,3,11],[22,17,2,3]]),highlight:Object.freeze([[13,6,7,1],[22,10,1,6]])}),
  swept:Object.freeze({shadow:Object.freeze([[10,6,13,4],[10,8,3,8],[19,8,4,5]]),highlight:Object.freeze([[13,6,7,2]])}),
  hooded:Object.freeze({shadow:Object.freeze([[10,5,13,11],[9,9,3,7],[21,8,3,8]]),highlight:Object.freeze([[12,5,9,2],[10,8,2,5]])}),
});
export const ARMOR_MATERIAL_COLORS=Object.freeze({leather:"#87573e",iron:"#838c88",steel:"#648a98",obsidian:"#66547b",giltsteel:"#b78b43"});
export const ARMOR_PALETTES=Object.freeze({
  common:Object.freeze({color:"#966b4b",detail:"#d1a06e"}),uncommon:Object.freeze({color:"#888e8b",detail:"#d1c39d"}),
  rare:Object.freeze({color:"#698fa0",detail:"#c2e0df"}),epic:Object.freeze({color:"#765d91",detail:"#d4a5e4"}),
  legendary:Object.freeze({color:"#b8893f",detail:"#ffdd82"}),
});
export const HAND_PALETTES=Object.freeze({common:"#735647",uncommon:"#8b8775",rare:"#658c96",epic:"#745985",legendary:"#bd9451"});
export function armorPaletteForItem(item){
  const rarity=ARMOR_PALETTES[item?.rarity]??ARMOR_PALETTES.common;
  return {color:ARMOR_MATERIAL_COLORS[item?.material]??rarity.color,detail:rarity.detail};
}
