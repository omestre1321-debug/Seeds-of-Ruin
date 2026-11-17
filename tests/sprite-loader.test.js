import test from "node:test";
import assert from "node:assert/strict";
import { createSpriteAtlas, categoryForItem, spriteIdForCategory, spriteIdForItem } from "../js/render/sprite-atlas.js";

function contextSpy() {
  const events=[];
  const context=new Proxy({imageSmoothingEnabled:true,globalAlpha:1}, {
    get(target,key){if(key in target)return target[key];return (...args)=>events.push([key,...args]);},
    set(target,key,value){target[key]=value;events.push(["set",key,value]);return true;},
  });
  return {context,events};
}

const atlasData={
  version:1,
  sheets:{items:{file:"assets/sprites/items.png",width:32,height:16}},
  categories:{weapon_sword:["sword-0","sword-1"],potion:["potion-0"]},
  sprites:[
    {id:"sword-0",sheet:"items",x:0,y:0,width:16,height:16,category:"weapon_sword"},
    {id:"sword-1",sheet:"items",x:16,y:0,width:16,height:16,category:"weapon_sword"},
    {id:"potion-0",sheet:"items",x:0,y:0,width:16,height:16,category:"potion"},
  ],
};

function fakeFetch(atlas=atlasData) { return async()=>({ok:true,json:async()=>atlas}); }

class GoodImage { async decode(){} set src(value){this.url=value;} }

class BadImage { async decode(){throw new Error("missing sheet");} set src(value){this.url=value;} }

test("item types map to atlas categories and rarities/floors choose ordered sprites",()=>{
  assert.equal(categoryForItem({type:"weapon",name:"Cinder Reed Bow"}),"weapon_bow");
  assert.equal(categoryForItem({type:"armor"}),"chest_armor");
  assert.equal(categoryForItem({type:"scroll"}),"book");
  assert.equal(categoryForItem({type:"tonic"}),"potion");
  assert.equal(categoryForItem({type:"shield"}),"shield");
  assert.equal(categoryForItem({type:"gloves"}),"gloves");
  assert.equal(spriteIdForCategory(atlasData,"weapon_sword",{rarity:"common",floor:1}),"sword-0");
  assert.equal(spriteIdForCategory(atlasData,"weapon_sword",{rarity:"legendary",floor:4}),"sword-1");
  assert.equal(spriteIdForItem(atlasData,{type:"tonic",rarity:"common"}),"potion-0");
  assert.equal(spriteIdForCategory(atlasData,"gloves"),null);
});

test("missing sprite IDs draw a visible placeholder and warn only once without throwing",async()=>{
  const logged=[];const atlas=createSpriteAtlas({fetchImpl:fakeFetch(),ImageCtor:GoodImage,logger:{warn:(message)=>logged.push(message)}});
  assert.equal((await atlas.load()).ok,true);
  const {context,events}=contextSpy();
  assert.equal(atlas.draw(context,"missing-id",3,4,{width:24,height:24}),false);
  assert.equal(atlas.draw(context,"missing-id",3,4,{width:24,height:24}),false);
  assert.ok(events.some(([name])=>name==="fillRect"));
  assert.equal(logged.filter((line)=>line.includes("missing-id")).length,1);
});

test("missing atlas or sheet loads are non-fatal and draw placeholders",async()=>{
  const logged=[];
  const noAtlas=createSpriteAtlas({fetchImpl:async()=>{throw new Error("network down");},ImageCtor:GoodImage,logger:{warn:(message)=>logged.push(message)}});
  assert.equal((await noAtlas.load()).ok,false);
  const first=contextSpy();assert.equal(noAtlas.draw(first.context,"unknown",0,0),false);
  const noImage=createSpriteAtlas({fetchImpl:fakeFetch(),ImageCtor:BadImage,logger:{warn:(message)=>logged.push(message)}});
  assert.equal((await noImage.load()).ok,true);
  const second=contextSpy();assert.equal(noImage.draw(second.context,"sword-0",0,0,{scale:2}),false);
  assert.ok(second.events.some(([name])=>name==="fillRect"));
  assert.ok(logged.some((line)=>line.includes("network down")));
  assert.ok(logged.some((line)=>line.includes("missing sheet")));
});

test("valid sprites draw with smoothing disabled and integer destination coordinates",async()=>{
  const atlas=createSpriteAtlas({fetchImpl:fakeFetch(),ImageCtor:GoodImage,logger:{warn(){}}});
  await atlas.load();
  const {context,events}=contextSpy();
  assert.equal(atlas.draw(context,"sword-0",2.4,4.8,{scale:3,flipX:true}),true);
  assert.ok(events.some(([name,key,value])=>name==="set"&&key==="imageSmoothingEnabled"&&value===false));
  assert.ok(events.some(([name,...args])=>name==="drawImage"&&args.slice(1).every(Number.isFinite)));
});
