import { getAppearanceColors, sanitizeAppearance } from "../data/appearance.js";
import { visualForItem } from "../data/itemVisuals.js";

const WIDTH=32;
const HEIGHT=40;
const SYSTEM_COLORS={ink:"#202925",deep:"#303630",metal:"#8d9990",shine:"#e8d5a0",eye:"#17211e"};

function equipmentKey(equipment={}){
  return Object.fromEntries(Object.entries(equipment).map(([slot,item])=>[slot,item?`${item.visualId??item.type}:${item.rarity??"common"}`:null]));
}

/** Pure data description used by Node tests and the Canvas compositor. */
export function buildCharacterLayers(character,equipment={}){
  const appearance=sanitizeAppearance(character?.appearance);
  const headItem=equipment.helmet??null;
  return [
    {id:"shadow",source:"ground-oval"},
    {id:"body",source:`skin:${appearance.skin}`},
    {id:"outfit",source:`cloth:${appearance.outfitColor}`,classId:character?.classId??"vanguard"},
    {id:"boots",source:equipment.boots?.visualId??null},
    {id:"armor",source:equipment.armor?.visualId??null},
    {id:"head",source:headItem?.visualId??`hair:${appearance.hairStyle}:${appearance.hairColor}`,faceStyle:appearance.faceStyle},
    {id:"accessories",source:[equipment.ring1?.visualId,equipment.ring2?.visualId,equipment.amulet?.visualId].filter(Boolean)},
    {id:"weapon",source:equipment.weapon?.visualId??null},
    {id:"effects",source:null},
  ];
}

function makeCanvas(width,height){
  if(typeof OffscreenCanvas!=="undefined")return new OffscreenCanvas(width,height);
  if(typeof document!=="undefined"){
    const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;return canvas;
  }
  throw new Error("CharacterRenderer needs a Canvas implementation when draw() is called.");
}

function roleColor(visual,role){return visual?.[role]??SYSTEM_COLORS.metal;}
function drawPiece(context,piece,visual){
  context.fillStyle=roleColor(visual,piece.color);
  if(visual.glow>0.38){context.shadowColor=visual.accent;context.shadowBlur=visual.glow*5;}
  if(piece.shape==="rect")context.fillRect(piece.x,piece.y,piece.w,piece.h);
  else if(piece.shape==="circle"){
    context.beginPath();context.arc(piece.x,piece.y,piece.r,0,Math.PI*2);context.fill();
  }else if(piece.shape==="line"){
    context.strokeStyle=roleColor(visual,piece.color);context.lineWidth=piece.width;context.lineCap="round";
    context.beginPath();context.moveTo(piece.x1,piece.y1);context.lineTo(piece.x2,piece.y2);context.stroke();
  }else if(piece.shape==="poly"){
    context.beginPath();piece.points.forEach(([x,y],index)=>index===0?context.moveTo(x,y):context.lineTo(x,y));context.closePath();context.fill();
  }
  context.shadowBlur=0;
}

function drawVisual(context,item){
  if(!item)return;
  const visual=visualForItem(item);if(!visual)return;
  for(const piece of visual.pieces)drawPiece(context,piece,visual);
}

function drawBody(context,character){
  const colors=getAppearanceColors(character?.appearance);
  // A compact, original cinder-delver silhouette in a 32×40 drawing grid.
  context.fillStyle=colors.skinShadow;context.fillRect(12,8,10,11);context.fillRect(9,17,3,8);context.fillRect(22,17,3,8);context.fillRect(12,26,4,8);context.fillRect(19,26,4,8);
  context.fillStyle=colors.skin;context.fillRect(13,8,8,9);context.fillRect(10,18,2,6);context.fillRect(22,18,2,6);context.fillRect(13,25,3,8);context.fillRect(19,25,3,8);
  context.fillStyle="#ead0a5";context.fillRect(14,10,6,5);
  context.fillStyle=SYSTEM_COLORS.eye;context.fillRect(15,12,1,1);context.fillRect(19,12,1,1);
  context.fillStyle="#d18a6c";context.fillRect(16,15,3,1);
  if(character?.appearance?.faceStyle==="scarred"){
    context.strokeStyle="#875449";context.lineWidth=1;context.beginPath();context.moveTo(18,10);context.lineTo(16,14);context.stroke();
  }else if(character?.appearance?.faceStyle==="painted"){
    context.fillStyle="#83b0a0";context.fillRect(13,11,2,1);context.fillRect(19,11,2,1);
  }else if(character?.appearance?.faceStyle==="masked"){
    context.fillStyle="#485c55";context.fillRect(13,13,8,3);context.fillStyle="#c99a64";context.fillRect(15,14,1,1);context.fillRect(19,14,1,1);
  }
}

function drawOutfit(context,character){
  const colors=getAppearanceColors(character?.appearance);
  context.fillStyle=colors.outfit;context.fillRect(11,17,12,11);context.fillRect(9,18,3,8);context.fillRect(22,18,3,8);
  context.fillStyle=colors.outfitShadow;context.fillRect(11,26,12,2);context.fillRect(12,28,4,4);context.fillRect(18,28,4,4);
  context.fillStyle=character?.classId==="wayfinder"?"#6e9c81":character?.classId==="emberAdept"?"#bd835f":"#c2995f";
  context.fillRect(15,18,3,9);context.fillRect(11,24,12,2);
  if(character?.classId==="wayfinder"){
    context.fillStyle="#c7d6bc";context.fillRect(10,18,3,2);context.fillRect(20,18,3,2);
  }else if(character?.classId==="emberAdept"){
    context.fillStyle="#edb878";context.fillRect(16,20,1,4);context.fillRect(14,22,5,1);
  }
}

function drawHair(context,character){
  const colors=getAppearanceColors(character?.appearance);
  const style=character?.appearance?.hairStyle??"swept";
  if(style==="hooded"){
    context.fillStyle=colors.outfitShadow;context.fillRect(10,5,13,11);context.fillRect(9,9,3,7);context.fillRect(21,8,3,8);
    context.fillStyle=colors.outfit;context.fillRect(12,5,9,2);context.fillRect(10,8,2,5);
    return;
  }
  context.fillStyle=colors.hairShadow;
  if(style==="cropped")context.fillRect(12,5,10,4);
  else if(style==="coils"){context.fillRect(11,6,12,4);for(const x of [12,16,20,22]){context.fillRect(x,4,2,3);}}
  else if(style==="braided"){context.fillRect(11,5,11,4);context.fillRect(21,8,3,11);context.fillRect(22,17,2,3);}
  else {context.fillRect(10,6,13,4);context.fillRect(10,8,3,8);context.fillRect(19,8,4,5);}
  context.fillStyle=colors.hair;context.fillRect(13,6,7,2);
  if(style==="braided"){context.fillStyle=colors.hair;context.fillRect(22,10,1,7);}
}

function compose(context,character,equipment){
  const layers=buildCharacterLayers(character,equipment);
  // 1 shadow, 2 body, 3 base clothes, 4 boots, 5 chest, 6 hair/helmet, 7 jewelry/weapon, 8 effects.
  context.fillStyle="rgba(4,8,7,.48)";context.beginPath();context.ellipse(16,36,10,2.3,0,0,Math.PI*2);context.fill();
  drawBody(context,character);
  drawOutfit(context,character);
  drawVisual(context,equipment.boots);
  drawVisual(context,equipment.armor);
  if(equipment.helmet)drawVisual(context,equipment.helmet);else drawHair(context,character);
  drawVisual(context,equipment.amulet);drawVisual(context,equipment.ring1);drawVisual(context,equipment.ring2);
  drawVisual(context,equipment.weapon);
  return layers;
}

export class CharacterRenderer{
  constructor({cacheLimit=64}={}){this.cacheLimit=cacheLimit;this.cache=new Map();this.recomposeCount=0;}
  cacheKey(character,equipment){return JSON.stringify([buildCharacterLayers(character,equipment),equipmentKeyForCache(equipment)]);}
  getSprite(character,equipment){
    const key=this.cacheKey(character,equipment);
    if(this.cache.has(key)){const sprite=this.cache.get(key);this.cache.delete(key);this.cache.set(key,sprite);return sprite;}
    const canvas=makeCanvas(WIDTH,HEIGHT);const context=canvas.getContext("2d");context.clearRect(0,0,WIDTH,HEIGHT);compose(context,character,equipment);this.recomposeCount+=1;
    this.cache.set(key,canvas);while(this.cache.size>this.cacheLimit)this.cache.delete(this.cache.keys().next().value);
    return canvas;
  }
  draw(context,x,y,size,character,equipment={},options={}){
    const sprite=this.getSprite(character,equipment);const time=options.time??0;
    const bob=options.moving?Math.sin(time/90)*1.1:Math.sin(time/420)*.45;
    const px=x-size/2;const py=y-size/2+bob*(size/HEIGHT);
    context.save();
    if(options.direction==="left"){context.translate(x*2,0);context.scale(-1,1);}
    context.drawImage(sprite,px,py,size,size);
    if(options.flash>0){context.globalAlpha=Math.min(.72,options.flash);context.globalCompositeOperation="screen";context.fillStyle="#fff2df";context.fillRect(px,py,size,size);}
    context.restore();
  }
  renderPreview(canvas,character,equipment={}){
    const context=canvas.getContext("2d");const bounds=canvas.getBoundingClientRect();const ratio=Math.min(globalThis.devicePixelRatio||1,2);
    const width=Math.max(1,Math.floor((bounds.width||canvas.width)*ratio));const height=Math.max(1,Math.floor((bounds.height||canvas.height)*ratio));
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    context.clearRect(0,0,width,height);const size=Math.min(width*.72,height*.84);this.draw(context,width/2,height*.54,size,character,equipment,{time:0});
  }
  clear(){this.cache.clear();}
}

function equipmentKeyForCache(equipment={}){
  return Object.fromEntries(Object.entries(equipment).map(([slot,item])=>[slot,item?`${item.id}:${item.visualId??item.type}:${item.rarity??"common"}`:null]));
}
