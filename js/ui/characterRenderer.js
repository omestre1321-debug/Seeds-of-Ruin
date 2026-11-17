import { getAppearanceColors, sanitizeAppearance } from "../data/appearance.js";
import { HAND_PALETTES, HAIR_STYLE_PIXELS, armorPaletteForItem, bodyVariantFor } from "../data/sprite-character-visuals.js";
import { spriteIdForItem } from "../render/sprite-atlas.js";

const WIDTH=32;
const HEIGHT=40;
const FALLBACK_COLORS={ink:"#252b29",deep:"#35403a",placeholder:"#d34cb8"};
const EQUIPMENT_LAYERS=["weapon","shield","armor","helmet","boots","gloves","ring1","ring2","amulet"];

function sourceFor(item){return item?.spriteId??item?.spriteCategory??item?.type??null;}
function equipmentKey(equipment={},atlas){
  return Object.fromEntries(EQUIPMENT_LAYERS.map((slot)=>{
    const item=equipment[slot];return [slot,item?`${item.id}:${spriteIdForItem(atlas,item)??sourceFor(item)}:${item.rarity??"common"}`:null];
  }));
}

/** Pure data description consumed by the compositor and Node tests. */
export function buildCharacterLayers(character,equipment={}){
  const appearance=sanitizeAppearance(character?.appearance);
  const body=bodyVariantFor(appearance.bodyVariant);
  const helmet=equipment.helmet??null;
  return [
    {id:"shadow",source:"ground-oval"},
    {id:"body",source:body.spriteId,bodyVariant:body.id,skin:appearance.skin,anchors:body.anchors,masks:body.masks},
    {id:"outfit",source:`palette:${appearance.outfitColor}`,classId:character?.classId??"vanguard",hairColor:appearance.hairColor,hairStyle:appearance.hairStyle,faceStyle:appearance.faceStyle,mask:"clothing"},
    {id:"boots",source:sourceFor(equipment.boots),mask:"boots"},
    {id:"armor",source:sourceFor(equipment.armor),mask:"armor",rarity:equipment.armor?.rarity??null},
    {id:"head",source:helmet?sourceFor(helmet):`hair:${appearance.hairStyle}:${appearance.hairColor}`,faceStyle:appearance.faceStyle},
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
          const shade=.4+luminance*.72;const mix=alpha;
          pixels.data[index]=Math.round(pixels.data[index]*(1-mix)+r*shade*mix);
          pixels.data[index+1]=Math.round(pixels.data[index+1]*(1-mix)+g*shade*mix);
          pixels.data[index+2]=Math.round(pixels.data[index+2]*(1-mix)+b*shade*mix);
        }
        context.putImageData(pixels,x,y);
        continue;
      }catch{/* fall through to source-atop tint for limited Canvas shims */}
    }
    context.save();context.globalCompositeOperation="source-atop";context.globalAlpha=alpha;context.fillStyle=color;context.fillRect(x,y,width,height);context.restore();
  }
}

function drawPlaceholder(context,spriteAtlas,id,x,y,width,height,scale=1){
  if(spriteAtlas?.draw){spriteAtlas.draw(context,id,x,y,{scale,width,height});return;}
  context.save();context.imageSmoothingEnabled=false;context.fillStyle=FALLBACK_COLORS.placeholder;context.fillRect(x,y,width,height);context.strokeStyle="#fff";context.strokeRect(x+.5,y+.5,Math.max(1,width-1),Math.max(1,height-1));context.restore();
}

function drawAtlas(context,spriteAtlas,item,x,y,{scale=1,width=null,height=null}={}){
  const id=spriteIdForItem(spriteAtlas?.atlas,item);
  if(spriteAtlas?.draw){
    const sprite=id?spriteAtlas.getSprite(id):null;
    const actualWidth=width??(sprite?.width??16)*scale;const actualHeight=height??(sprite?.height??16)*scale;
    return spriteAtlas.draw(context,id,x,y,{scale,width:actualWidth,height:actualHeight});
  }
  drawPlaceholder(context,null,id,x,y,width??16*scale,height??16*scale,scale);
  return false;
}

function drawBody(context,character,equipment,spriteAtlas){
  const appearance=sanitizeAppearance(character?.appearance);
  const body=bodyVariantFor(appearance.bodyVariant);
  const bodyContext=context;
  const bodyScale=2;
  const sprite=spriteAtlas?.getSprite(body.spriteId);
  const sourceWidth=sprite?.width??16;const sourceHeight=sprite?.height??16;
  const bodyWidth=sourceWidth*bodyScale;const bodyHeight=sourceHeight*bodyScale;
  const bodyX=Math.floor((WIDTH-bodyWidth)/2);const bodyY=Math.floor((HEIGHT-bodyHeight)/2);
  if(spriteAtlas?.draw)spriteAtlas.draw(bodyContext,body.spriteId,bodyX,bodyY,{scale:bodyScale});
  else drawPlaceholder(bodyContext,null,body.spriteId,bodyX,bodyY,bodyWidth,bodyHeight,bodyScale);

  const colors=getAppearanceColors(appearance);
  applyPaletteSwap(bodyContext,body.masks.skin,colors.skin,.72);
  applyPaletteSwap(bodyContext,body.masks.hair,colors.hair,.85);
  applyPaletteSwap(bodyContext,body.masks.clothing,colors.outfit,.78);
  if(equipment.armor){
    const armor=armorPaletteForItem(equipment.armor);
    applyPaletteSwap(bodyContext,body.masks.armor,armor.color,.84);
  }
  if(equipment.boots){
    const boots=armorPaletteForItem(equipment.boots);
    applyPaletteSwap(bodyContext,body.masks.boots,boots.color,.8);
  }
  if(equipment.gloves){applyPaletteSwap(bodyContext,body.masks.hands,HAND_PALETTES[equipment.gloves.rarity]??HAND_PALETTES.common,.78);}
  if(equipment.helmet){
    const helmet=armorPaletteForItem(equipment.helmet);
    applyPaletteSwap(bodyContext,body.masks.hair,helmet.color,.9);
  }
  return {body,bodyX,bodyY,bodyScale,bodyWidth,bodyHeight,appearance};
}

function drawGroundShadow(context){
  context.fillStyle="rgba(4,8,7,.58)";context.beginPath();context.ellipse(16,37,10,2.1,0,0,Math.PI*2);context.fill();
}

function drawFaceDetails(context,faceStyle){
  if(faceStyle==="scarred"){
    context.strokeStyle="#75483f";context.lineWidth=1;context.beginPath();context.moveTo(18,12);context.lineTo(16,17);context.stroke();
  }else if(faceStyle==="painted"){
    context.fillStyle="#74a69b";context.fillRect(11,12,3,1);context.fillRect(19,12,3,1);
  }else if(faceStyle==="masked"){
    context.fillStyle="#3d5550";context.fillRect(11,14,10,3);context.fillStyle="#cfad75";context.fillRect(13,15,2,1);context.fillRect(18,15,2,1);
  }
}

function drawHairStyle(context,appearance){
  const style=HAIR_STYLE_PIXELS[appearance?.hairStyle]??HAIR_STYLE_PIXELS.swept;
  const colors=getAppearanceColors(appearance);
  const hooded=appearance?.hairStyle==="hooded";
  context.save();context.fillStyle=hooded?colors.outfitShadow:colors.hairShadow;
  for(const [x,y,width,height]of style.shadow)context.fillRect(x,y,width,height);
  context.fillStyle=hooded?colors.outfit:colors.hair;
  for(const [x,y,width,height]of style.highlight)context.fillRect(x,y,width,height);
  context.restore();
}

function drawArmorDetail(context,item){
  if(!item)return;
  const palette=armorPaletteForItem(item);
  if(item.rarity==="common")return;
  context.save();context.fillStyle=palette.color;context.strokeStyle=palette.detail;
  context.fillRect(7,17,5,4);context.fillRect(20,17,5,4);
  context.fillRect(10,17,12,1);context.strokeRect(7.5,17.5,4,3);context.strokeRect(20.5,17.5,4,3);
  if(["epic","legendary"].includes(item.rarity)){
    context.fillStyle=palette.detail;context.beginPath();context.moveTo(16,19);context.lineTo(19,22);context.lineTo(16,25);context.lineTo(13,22);context.closePath();context.fill();
  }
  if(item.rarity==="legendary"){
    context.globalAlpha=.55;context.fillStyle="#fff0a5";context.fillRect(9,16,2,1);context.fillRect(22,16,2,1);context.globalAlpha=1;
  }
  context.restore();
}

function drawAccessory(context,item,spriteAtlas,anchor,size=1){
  if(!item)return;
  const sprite=spriteIdForItem(spriteAtlas?.atlas,item);const descriptor=sprite?spriteAtlas.getSprite(sprite):null;
  const scale=size;const width=(descriptor?.width??8)*scale;const height=(descriptor?.height??8)*scale;
  drawAtlas(context,spriteAtlas,item,Math.round(anchor.x-width/2),Math.round(anchor.y-height/2),{scale});
}

function compose(context,character,equipment,spriteAtlas){
  const layers=buildCharacterLayers(character,equipment);
  const bodyVariant=bodyVariantFor(sanitizeAppearance(character?.appearance).bodyVariant);
  drawGroundShadow(context);
  const bodyCanvas=makeCanvas(WIDTH,HEIGHT);const bodyContext=bodyCanvas.getContext("2d");bodyContext.clearRect(0,0,WIDTH,HEIGHT);bodyContext.imageSmoothingEnabled=false;
  const placement=drawBody(bodyContext,character,equipment,spriteAtlas);
  context.drawImage(bodyCanvas,0,0);
  drawFaceDetails(context,placement.appearance.faceStyle);
  if(!equipment.helmet)drawHairStyle(context,placement.appearance);
  drawArmorDetail(context,equipment.armor);
  const anchors=bodyVariant.anchors;
  if(equipment.helmet)drawAccessory(context,equipment.helmet,spriteAtlas,anchors.head,1);
  drawAccessory(context,equipment.amulet,spriteAtlas,anchors.neck,1);
  drawAccessory(context,equipment.ring1,spriteAtlas,anchors.ringMain,1);
  drawAccessory(context,equipment.ring2,spriteAtlas,anchors.ringOff,1);
  if(equipment.shield)drawAccessory(context,equipment.shield,spriteAtlas,anchors.offHand,1);
  return layers;
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
  drawWeapon(context,x,y,scale,character,equipment,options){
    const item=equipment?.weapon;if(!item)return;
    const body=bodyVariantFor(character?.appearance?.bodyVariant);const hand=body.anchors.mainHand;
    const anchorX=x+(hand.x-WIDTH/2)*scale;const anchorY=y+(hand.y-HEIGHT/2)*scale;
    const progress=Math.max(0,Math.min(1,options.swing??0));
    const angle=.36+Math.sin(progress*Math.PI)*1.65;
    const id=spriteIdForItem(this.spriteAtlas?.atlas,item);const sprite=id?this.spriteAtlas?.getSprite(id):null;
    const spriteScale=scale;const width=(sprite?.width??16)*spriteScale;const height=(sprite?.height??16)*spriteScale;
    context.save();context.translate(Math.round(anchorX),Math.round(anchorY));context.rotate(angle);
    drawAtlas(context,this.spriteAtlas,item,-Math.round(width*.28),-Math.round(height*.82),{scale:spriteScale});
    context.restore();
  }
  draw(context,x,y,size,character,equipment={},options={}){
    const sprite=this.getSprite(character,equipment);const time=options.time??0;
    const scale=Math.max(1,Math.min(4,Math.floor(Number(size)/HEIGHT)||1));
    const width=WIDTH*scale;const height=HEIGHT*scale;
    const centerX=Math.round(x);const centerY=Math.round(y);
    const bob=Math.round((options.moving?Math.sin(time/90)*1.1:Math.sin(time/420)*.35)*scale);
    const px=centerX-width/2;const py=centerY-height/2+bob;
    context.save();context.imageSmoothingEnabled=false;
    if(options.direction==="left"){context.translate(centerX*2,0);context.scale(-1,1);}
    context.drawImage(sprite,px,py,width,height);
    this.drawWeapon(context,centerX,centerY+bob,scale,character,equipment,options);
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
