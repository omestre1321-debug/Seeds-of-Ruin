import { getAppearanceColors, sanitizeAppearance } from "../data/appearance.js";
import { HAND_PALETTES, PLAYER_ANCHORS, PLAYER_PALETTE_MASKS, armorPaletteForItem } from "../data/sprite-character-visuals.js";
import { spriteIdForItem } from "../render/sprite-atlas.js";

const WIDTH=32;
const HEIGHT=40;
const SYSTEM_COLORS={ink:"#202925",metal:"#8d9990",shine:"#e8d5a0",eye:"#17211e",placeholder:"#d34cb8"};
const EQUIPMENT_LAYERS=["weapon","shield","armor","helmet","boots","gloves","ring1","ring2","amulet"];

function sourceFor(item){return item?.spriteId??item?.spriteCategory??item?.type??null;}
function equipmentKey(equipment={},atlas){
  return Object.fromEntries(EQUIPMENT_LAYERS.map((slot)=>{
    const item=equipment[slot];return [slot,item?`${item.id}:${spriteIdForItem(atlas,item)??sourceFor(item)}:${item.rarity??"common"}:${item.material??""}`:null];
  }));
}

/** The player silhouette remains the original procedural Canvas design; only gear uses sheets. */
export function buildCharacterLayers(character,equipment={}){
  const appearance=sanitizeAppearance(character?.appearance);
  return [
    {id:"shadow",source:"ground-oval"},
    {id:"body",source:`skin:${appearance.skin}`},
    {id:"outfit",source:`cloth:${appearance.outfitColor}`,classId:character?.classId??"vanguard"},
    {id:"boots",source:sourceFor(equipment.boots),mask:"boots"},
    {id:"gloves",source:sourceFor(equipment.gloves),mask:"hands"},
    {id:"armor",source:sourceFor(equipment.armor),mask:"armor",rarity:equipment.armor?.rarity??null,material:equipment.armor?.material??null},
    {id:"head",source:equipment.helmet?sourceFor(equipment.helmet):`hair:${appearance.hairStyle}:${appearance.hairColor}`,faceStyle:appearance.faceStyle},
    {id:"accessories",source:[equipment.ring1,equipment.ring2,equipment.amulet,equipment.shield].map(sourceFor).filter(Boolean)},
    {id:"weapon",source:sourceFor(equipment.weapon)},
    {id:"effects",source:null},
  ];
}

function makeCanvas(width,height){
  if(typeof globalThis.OffscreenCanvas==="function")return new globalThis.OffscreenCanvas(width,height);
  if(typeof document!=="undefined"){
    const canvas=document.createElement("canvas");canvas.width=width;canvas.height=height;return canvas;
  }
  throw new Error("CharacterRenderer needs a Canvas implementation when draw() is called.");
}

function parseColor(hex){
  const value=Number.parseInt(String(hex??"#ffffff").slice(1),16);
  return [(value>>16)&255,(value>>8)&255,value&255];
}

function applyPaletteSwap(context,regions,color,alpha=.72){
  if(!Array.isArray(regions)||!color)return;
  const [r,g,b]=parseColor(color);
  for(const region of regions){
    const x=Math.max(0,Math.floor(region.x));const y=Math.max(0,Math.floor(region.y));
    const width=Math.max(0,Math.min(WIDTH-x,Math.floor(region.width)));const height=Math.max(0,Math.min(HEIGHT-y,Math.floor(region.height)));
    if(!width||!height)continue;
    if(typeof context.getImageData==="function"&&typeof context.putImageData==="function"){
      try{
        const pixels=context.getImageData(x,y,width,height);
        for(let index=0;index<pixels.data.length;index+=4){
          if(pixels.data[index+3]===0)continue;
          const luminance=(pixels.data[index]*.2126+pixels.data[index+1]*.7152+pixels.data[index+2]*.0722)/255;
          if(luminance<.12)continue;
          const shade=.4+luminance*.72;
          pixels.data[index]=Math.round(pixels.data[index]*(1-alpha)+r*shade*alpha);
          pixels.data[index+1]=Math.round(pixels.data[index+1]*(1-alpha)+g*shade*alpha);
          pixels.data[index+2]=Math.round(pixels.data[index+2]*(1-alpha)+b*shade*alpha);
        }
        context.putImageData(pixels,x,y);continue;
      }catch{/* fall through to source-atop tint for limited Canvas shims */}
    }
    context.save();context.globalCompositeOperation="source-atop";context.globalAlpha=alpha;context.fillStyle=color;context.fillRect(x,y,width,height);context.restore();
  }
}

function drawPlaceholder(context,spriteAtlas,id,x,y,width,height,scale=1){
  if(spriteAtlas?.draw){spriteAtlas.draw(context,id,x,y,{scale,width,height});return;}
  context.save();context.imageSmoothingEnabled=false;context.fillStyle=SYSTEM_COLORS.placeholder;context.fillRect(x,y,width,height);context.strokeStyle="#fff";context.strokeRect(x+.5,y+.5,Math.max(1,width-1),Math.max(1,height-1));context.restore();
}

function drawAtlas(context,spriteAtlas,item,x,y,{scale=1,width=null,height=null,flipX=false,alpha=1}={}){
  const id=spriteIdForItem(spriteAtlas?.atlas,item);
  if(spriteAtlas?.draw){
    const sprite=id?spriteAtlas.getSprite(id):null;
    const actualWidth=width??(sprite?.width??16)*scale;const actualHeight=height??(sprite?.height??16)*scale;
    return spriteAtlas.draw(context,id,x,y,{scale,width:actualWidth,height:actualHeight,flipX,alpha});
  }
  drawPlaceholder(context,null,id,x,y,width??16*scale,height??16*scale,scale);
  return false;
}

// Original procedural player body/outfit preserved from the pre-atlas renderer.
function drawBody(context,character){
  const colors=getAppearanceColors(character?.appearance);
  context.fillStyle=colors.skinShadow;context.fillRect(12,8,10,11);context.fillRect(9,17,3,8);context.fillRect(22,17,3,8);context.fillRect(12,26,4,8);context.fillRect(19,26,4,8);
  context.fillStyle=colors.skin;context.fillRect(13,8,8,9);context.fillRect(10,18,2,6);context.fillRect(22,18,2,6);context.fillRect(13,25,3,8);context.fillRect(19,25,3,8);
  context.fillStyle="#ead0a5";context.fillRect(14,10,6,5);context.fillStyle=SYSTEM_COLORS.eye;context.fillRect(15,12,1,1);context.fillRect(19,12,1,1);context.fillStyle="#d18a6c";context.fillRect(16,15,3,1);
  if(character?.appearance?.faceStyle==="scarred"){context.strokeStyle="#875449";context.lineWidth=1;context.beginPath();context.moveTo(18,10);context.lineTo(16,14);context.stroke();}
  else if(character?.appearance?.faceStyle==="painted"){context.fillStyle="#83b0a0";context.fillRect(13,11,2,1);context.fillRect(19,11,2,1);}
  else if(character?.appearance?.faceStyle==="masked"){context.fillStyle="#485c55";context.fillRect(13,13,8,3);context.fillStyle="#c99a64";context.fillRect(15,14,1,1);context.fillRect(19,14,1,1);}
}

function drawOutfit(context,character){
  const colors=getAppearanceColors(character?.appearance);
  context.fillStyle=colors.outfit;context.fillRect(11,17,12,11);context.fillRect(9,18,3,8);context.fillRect(22,18,3,8);
  context.fillStyle=colors.outfitShadow;context.fillRect(11,26,12,2);context.fillRect(12,28,4,4);context.fillRect(18,28,4,4);
  context.fillStyle=character?.classId==="wayfinder"?"#6e9c81":character?.classId==="emberAdept"?"#bd835f":"#c2995f";
  context.fillRect(15,18,3,9);context.fillRect(11,24,12,2);
  if(character?.classId==="wayfinder"){context.fillStyle="#c7d6bc";context.fillRect(10,18,3,2);context.fillRect(20,18,3,2);}
  else if(character?.classId==="emberAdept"){context.fillStyle="#edb878";context.fillRect(16,20,1,4);context.fillRect(14,22,5,1);}
}

function drawHair(context,character){
  const colors=getAppearanceColors(character?.appearance);const style=character?.appearance?.hairStyle??"swept";
  if(style==="hooded"){
    context.fillStyle=colors.outfitShadow;context.fillRect(10,5,13,11);context.fillRect(9,9,3,7);context.fillRect(21,8,3,8);
    context.fillStyle=colors.outfit;context.fillRect(12,5,9,2);context.fillRect(10,8,2,5);return;
  }
  context.fillStyle=colors.hairShadow;
  if(style==="cropped")context.fillRect(12,5,10,4);
  else if(style==="coils"){context.fillRect(11,6,12,4);for(const x of [12,16,20,22])context.fillRect(x,4,2,3);}
  else if(style==="braided"){context.fillRect(11,5,11,4);context.fillRect(21,8,3,11);context.fillRect(22,17,2,3);}
  else{context.fillRect(10,6,13,4);context.fillRect(10,8,3,8);context.fillRect(19,8,4,5);}
  context.fillStyle=colors.hair;context.fillRect(13,6,7,2);if(style==="braided"){context.fillStyle=colors.hair;context.fillRect(22,10,1,7);}
}

function drawGroundShadow(context){context.fillStyle="rgba(4,8,7,.48)";context.beginPath();context.ellipse(16,36,10,2.3,0,0,Math.PI*2);context.fill();}
function drawArmorDetail(context,item){
  if(!item||item.rarity==="common")return;const palette=armorPaletteForItem(item);
  context.save();context.fillStyle=palette.color;context.strokeStyle=palette.detail;context.fillRect(7,17,5,4);context.fillRect(20,17,5,4);context.fillRect(10,17,12,1);context.strokeRect(7.5,17.5,4,3);context.strokeRect(20.5,17.5,4,3);
  if(["epic","legendary"].includes(item.rarity)){context.fillStyle=palette.detail;context.beginPath();context.moveTo(16,19);context.lineTo(19,22);context.lineTo(16,25);context.lineTo(13,22);context.closePath();context.fill();}
  if(item.rarity==="legendary"){context.globalAlpha=.55;context.fillStyle="#fff0a5";context.fillRect(9,16,2,1);context.fillRect(22,16,2,1);}
  context.restore();
}

function drawIconAt(context,spriteAtlas,item,x,y,{scale=1,clip=null}={}){
  if(!item)return;
  if(clip){context.save();context.beginPath();context.rect(clip.x,clip.y,clip.width,clip.height);context.clip();}
  const sprite=spriteIdForItem(spriteAtlas?.atlas,item);const box=sprite?spriteAtlas.getSprite(sprite):null;
  const width=(box?.width??12)*scale;const height=(box?.height??12)*scale;
  drawAtlas(context,spriteAtlas,item,Math.round(x-width/2),Math.round(y-height/2),{scale});
  if(clip)context.restore();
}

function compose(context,character,equipment,spriteAtlas){
  const layers=buildCharacterLayers(character,equipment);
  drawGroundShadow(context);drawBody(context,character);drawOutfit(context,character);
  if(equipment.armor)applyPaletteSwap(context,PLAYER_PALETTE_MASKS.armor,armorPaletteForItem(equipment.armor).color,.75);
  if(equipment.boots)applyPaletteSwap(context,PLAYER_PALETTE_MASKS.boots,armorPaletteForItem(equipment.boots).color,.78);
  if(equipment.gloves)applyPaletteSwap(context,PLAYER_PALETTE_MASKS.hands,HAND_PALETTES[equipment.gloves.rarity]??HAND_PALETTES.common,.8);
  if(equipment.helmet){applyPaletteSwap(context,PLAYER_PALETTE_MASKS.hair,armorPaletteForItem(equipment.helmet).color,.88);drawIconAt(context,spriteAtlas,equipment.helmet,PLAYER_ANCHORS.head.x,PLAYER_ANCHORS.head.y,{scale:1,clip:{x:8,y:4,width:16,height:8}});}
  else drawHair(context,character);
  drawArmorDetail(context,equipment.armor);
  drawIconAt(context,spriteAtlas,equipment.amulet,PLAYER_ANCHORS.neck.x,PLAYER_ANCHORS.neck.y,{scale:1});
  drawIconAt(context,spriteAtlas,equipment.ring1,PLAYER_ANCHORS.ringMain.x,PLAYER_ANCHORS.ringMain.y,{scale:1});
  drawIconAt(context,spriteAtlas,equipment.ring2,PLAYER_ANCHORS.ringOff.x,PLAYER_ANCHORS.ringOff.y,{scale:1});
  drawIconAt(context,spriteAtlas,equipment.shield,PLAYER_ANCHORS.offHand.x,PLAYER_ANCHORS.offHand.y,{scale:1});
  return layers;
}

function clampPosition(context,centerX,centerY,width,height,margin){
  const canvas=context.canvas;if(!canvas||!Number.isFinite(canvas.width)||!Number.isFinite(canvas.height))return{centerX,centerY};
  const lowX=Math.min(margin,Math.max(0,(canvas.width-width)/2));const lowY=Math.min(margin,Math.max(0,(canvas.height-height)/2));
  const left=Math.max(lowX,Math.min(canvas.width-width-lowX,centerX-width/2));
  const top=Math.max(lowY,Math.min(canvas.height-height-lowY,centerY-height/2));
  return{centerX:left+width/2,centerY:top+height/2,left,top};
}

export class CharacterRenderer{
  constructor({cacheLimit=64,spriteAtlas=null}={}){this.cacheLimit=cacheLimit;this.cache=new Map();this.recomposeCount=0;this.spriteAtlas=spriteAtlas;}
  cacheKey(character,equipment){return JSON.stringify([buildCharacterLayers(character,equipment),equipmentKey(equipment,this.spriteAtlas?.atlas)]);}
  getSprite(character,equipment){
    const key=this.cacheKey(character,equipment);
    if(this.cache.has(key)){const sprite=this.cache.get(key);this.cache.delete(key);this.cache.set(key,sprite);return sprite;}
    const canvas=makeCanvas(WIDTH,HEIGHT);const context=canvas.getContext("2d");context.clearRect(0,0,WIDTH,HEIGHT);context.imageSmoothingEnabled=false;compose(context,character,equipment,this.spriteAtlas);this.recomposeCount+=1;
    this.cache.set(key,canvas);while(this.cache.size>this.cacheLimit)this.cache.delete(this.cache.keys().next().value);
    return canvas;
  }
  drawWeapon(context,centerX,centerY,scale,character,equipment,options){
    const item=equipment?.weapon;if(!item)return;const anchor=PLAYER_ANCHORS.mainHand;
    const x=centerX+(anchor.x-WIDTH/2)*scale;const y=centerY+(anchor.y-HEIGHT/2)*scale;
    const progress=Math.max(0,Math.min(1,options.swing??0));const angle=.36+Math.sin(progress*Math.PI)*1.65;
    const spriteId=spriteIdForItem(this.spriteAtlas?.atlas,item);const sprite=spriteId?this.spriteAtlas?.getSprite(spriteId):null;const spriteScale=scale;
    const width=(sprite?.width??16)*spriteScale;const height=(sprite?.height??16)*spriteScale;
    context.save();context.translate(Math.round(x),Math.round(y));context.rotate(angle);
    drawAtlas(context,this.spriteAtlas,item,-Math.round(width*.28),-Math.round(height*.82),{scale:spriteScale});context.restore();
  }
  draw(context,x,y,size,character,equipment={},options={}){
    const sprite=this.getSprite(character,equipment);const time=options.time??0;const canvas=context.canvas;
    const viewportScale=canvas?Math.min(canvas.width/WIDTH,canvas.height/HEIGHT):4;
    const scale=Math.max(1,Math.min(4,Math.round(Number(size)/HEIGHT)||1,Math.floor(viewportScale)||1));
    const width=WIDTH*scale;const height=HEIGHT*scale;const bob=Math.round((options.moving?Math.sin(time/90)*1.1:Math.sin(time/420)*.35)*scale);
    const clamped=clampPosition(context,Math.round(x),Math.round(y)+bob,width,height,12*scale);const centerX=Math.round(clamped.centerX);const centerY=Math.round(clamped.centerY);
    const px=Math.round(centerX-width/2);const py=Math.round(centerY-height/2);
    context.save();context.imageSmoothingEnabled=false;
    if(options.direction==="left"){context.translate(centerX*2,0);context.scale(-1,1);}
    context.drawImage(sprite,px,py,width,height);
    this.drawWeapon(context,centerX,centerY,scale,character,equipment,options);
    if(options.flash>0){context.save();context.globalAlpha=Math.min(.72,options.flash);context.filter="brightness(2.8) grayscale(1)";context.drawImage(sprite,px,py,width,height);context.filter="none";context.restore();}
    context.restore();
  }
  renderPreview(canvas,character,equipment={}){
    const context=canvas.getContext("2d");const bounds=canvas.getBoundingClientRect();const ratio=Math.min(globalThis.devicePixelRatio||1,2);
    const width=Math.max(1,Math.floor((bounds.width||canvas.width)*ratio));const height=Math.max(1,Math.floor((bounds.height||canvas.height)*ratio));
    if(canvas.width!==width||canvas.height!==height){canvas.width=width;canvas.height=height;}
    context.clearRect(0,0,width,height);context.imageSmoothingEnabled=false;const size=Math.min(width*.72,height*.84);this.draw(context,width/2,height*.54,size,character,equipment,{time:0});
  }
  clear(){this.cache.clear();}
}
