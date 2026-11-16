import { createGame, getRunSummary, performAction } from "./core/game.js";
import { dailySeed, Rng } from "./core/rng.js";
import { findPath } from "./core/pathfinding.js";
import { TILE } from "./core/map/tiles.js";
import { MUTATORS } from "./core/mutators.js";
import { recordRun, sanitizeProfile, selectMutator } from "./core/progression.js";
import { loadProfile, loadOptions, saveProfile, saveOptions } from "./utils/storage.js";
import { randomWorldSeed } from "./utils/seed-input.js";
import { drawGame, drawMinimap, screenToTile } from "./render/dungeon-renderer.js";
import { EQUIPMENT_SLOTS, compareWithEquipped } from "./items/equipment.js";
import { INVENTORY_CAPACITY, isStackable } from "./items/inventory.js";
import { getRarity } from "./items/rarity.js";
import { CLASS_LIST } from "./data/classes.js";
import { APPEARANCE_OPTIONS } from "./data/appearance.js";
import { createCharacter, randomCharacter } from "./core/character.js";
import { CharacterRenderer } from "./ui/characterRenderer.js";
import { ParticleSystem } from "./ui/particles.js";

const $ = (selector) => document.querySelector(selector);
const characterRenderer=new CharacterRenderer({cacheLimit:64});
const ui = {
  menu: $("#menu-screen"), character: $("#character-screen"), game: $("#game-screen"), end: $("#end-screen"),
  menuSeed: $("#seed-input"), mutator: $("#mutator-select"), startForm: $("#start-form"),
  characterForm:$("#character-form"),
  gameCanvas: $("#game-canvas"), particleCanvas: $("#particle-canvas"), minimap: $("#minimap"), damageLayer: $("#damage-layer"),
  characterName:$("#character-name"),classSelect:$("#class-select"),classSummary:$("#class-summary"),previewCanvas:$("#character-preview"),namePreview:$("#character-name-preview"),rolePreview:$("#class-role-preview"),creationSeed:$("#creation-seed"),
  modal: $("#modal-root"), modalTitle: $("#modal-title"), modalEyebrow: $("#modal-eyebrow"), modalContent: $("#modal-content"),
  floorTitle: $("#floor-title"), floorSubtitle: $("#floor-subtitle"), runSeed: $("#run-seed"), runScore: $("#run-score"),
  turn: $("#turn-label"), location: $("#location-label"), hp: $("#hp-label"), hpMeter: $("#hp-meter"),
  xp: $("#xp-label"), gold: $("#gold-label"), level: $("#level-label"), attack: $("#attack-label"), defense: $("#defense-label"), crit: $("#crit-label"),
  log: $("#combat-log"), enemyCount: $("#enemy-count"), visibility: $("#visibility-label"),
  reducedEffects:$("#reduced-effects"),
};

let profile = loadProfile();
let visualOptions=loadOptions();
const particles=new ParticleSystem({maxParticles:500,reducedMotion:visualOptions.reducedEffects});
const visualRng=new Rng("ashen-reach-visuals");
const particleContext=ui.particleCanvas.getContext("2d");
let lastLayout=null;
let game = null;
let modalMode = null;
let audioContext = null;
let soundEnabled = true;
let lastLogLength = 0;
let pendingSeed="ASH-001";
let walkingUntil=0;
let flashUntil=0;
let selectedInventoryId=null;
let selectedRingSlot="ring1";
let inventoryNotice="";

function showScreen(name) {
  ui.menu.classList.toggle("is-hidden", name !== "menu");
  ui.character.classList.toggle("is-hidden", name !== "character");
  ui.game.classList.toggle("is-hidden", name !== "game");
  ui.end.classList.toggle("is-hidden", name !== "end");
  if (name !== "game") closeModal();
}

function saveProgress() {
  const saved = saveProfile(profile);
  if (!saved) setLocation("Local progress could not be saved; this run remains playable.");
}

function populateMutators() {
  if(ui.reducedEffects)ui.reducedEffects.checked=visualOptions.reducedEffects;
  particles.setReducedMotion(visualOptions.reducedEffects);
  ui.mutator.replaceChildren();
  for (const mutator of Object.values(MUTATORS)) {
    const option = document.createElement("option");
    option.value = mutator.id;
    const unlocked = profile.unlockedMutators.includes(mutator.id);
    option.textContent = unlocked ? `${mutator.name} — ${mutator.description}` : `${mutator.name} — locked`;
    option.disabled = !unlocked;
    ui.mutator.append(option);
  }
  ui.mutator.value = profile.unlockedMutators.includes(profile.selectedMutator) ? profile.selectedMutator : "none";
  $("#menu-best-score").textContent = String(profile.bestScore);
  $("#menu-best-floor").textContent = profile.bestFloor ? `FLOOR ${profile.bestFloor}` : "—";
  $("#menu-wins").textContent = String(profile.wins);
  $("#menu-runs").textContent = String(profile.runs);
}

let characterChoicesReady=false;
function fillAppearanceSelect(id,options,selected){
  const select=document.querySelector(`#appearance-${id}`);select.replaceChildren();
  for(const entry of options){const option=document.createElement("option");option.value=entry.id;option.textContent=entry.label;select.append(option);}
  select.value=selected;
}
function populateCharacterChoices(){
  if(characterChoicesReady)return;
  ui.classSelect.replaceChildren();
  for(const definition of CLASS_LIST){const option=document.createElement("option");option.value=definition.id;option.textContent=`${definition.name} — ${definition.role}`;ui.classSelect.append(option);}
  characterChoicesReady=true;
}
function readCharacterDraft(){
  return createCharacter({name:ui.characterName.value,classId:ui.classSelect.value,appearance:{
    skin:$("#appearance-skin").value,hairStyle:$("#appearance-hairStyle").value,hairColor:$("#appearance-hairColor").value,
    faceStyle:$("#appearance-faceStyle").value,outfitColor:$("#appearance-outfitColor").value,
  }});
}
function renderCharacterDraft(){
  const character=readCharacterDraft();
  const definition=CLASS_LIST.find((entry)=>entry.id===character.classId);
  ui.namePreview.textContent=character.name;ui.rolePreview.textContent=`${character.className} · ${character.passiveName}`;
  const stats=character.stats;ui.classSummary.replaceChildren();
  const summary=document.createElement("p");summary.textContent=definition.description;ui.classSummary.append(summary);
  const passive=document.createElement("p");passive.className="passive-summary";passive.textContent=`PASSIVE · ${character.passiveDescription}`;ui.classSummary.append(passive);
  const list=document.createElement("div");list.className="class-stat-list";
  for(const [label,value] of [["HP",stats.maxHp],["ATK",stats.attack],["DEF",stats.defense],["CRIT",`${Math.round(stats.crit*100)}%`],["SPEED",`${Math.round(stats.speed*100)}%`],["VISION",8+stats.vision],["REACH",1+stats.reach]]){
    const cell=document.createElement("span");cell.textContent=`${label} ${value}`;list.append(cell);
  }
  ui.classSummary.append(list);
  characterRenderer.renderPreview(ui.previewCanvas,character,{weapon:character.startingWeapon,armor:null,helmet:null,boots:null,ring1:null,ring2:null,amulet:null});
}
function openCharacterCreation(seedValue){
  pendingSeed=String(seedValue||"ASH-001").trim().slice(0,32)||"ASH-001";
  ui.creationSeed.textContent=pendingSeed;
  populateCharacterChoices();
  const saved=createCharacter(profile.defaultCharacter);
  const suggested=profile.runs===0&&saved.name==="Delver"?randomCharacter(new Rng(`suggested-look:${randomWorldSeed()}`)):saved;
  ui.characterName.value=suggested.name;ui.classSelect.value=suggested.classId;
  for(const key of ["skin","hairStyle","hairColor","faceStyle","outfitColor"])fillAppearanceSelect(key,APPEARANCE_OPTIONS[key],suggested.appearance[key]);
  showScreen("character");renderCharacterDraft();
}

function beginRun(seedValue,characterValue=profile.defaultCharacter) {
  const seed = String(seedValue || "ASH-001").trim().slice(0, 32) || "ASH-001";
  const character=createCharacter(characterValue);
  const selection = selectMutator(profile, ui.mutator.value);
  profile = {...selection.profile,defaultCharacter:character};
  saveProgress();
  game = createGame(seed, profile, { maxFloors: 4, mutator: profile.selectedMutator, character });
  visualRng.state=new Rng(`${game.seed}::visual-fx`).state;
  particles.clear();
  modalMode = null;
  lastLogLength = 0;
  showScreen("game");
  renderGame();
  playSound("start");
}

function setLocation(text) {
  if (ui.location) ui.location.textContent = text;
}

function pixelSize(canvas) {
  const bounds = canvas.getBoundingClientRect();
  const ratio = Math.min(globalThis.devicePixelRatio || 1, 2);
  return { width: Math.max(1, Math.floor(bounds.width * ratio)), height: Math.max(1, Math.floor(bounds.height * ratio)) };
}

function resizeCanvas(canvas) {
  const { width, height } = pixelSize(canvas);
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
}

function tileScreenPoint(x,y){
  if(!lastLayout||!game)return null;
  return {x:lastLayout.offsetX+(x+.5)*lastLayout.tileSize,y:lastLayout.offsetY+(y+.5)*lastLayout.tileSize};
}
function emitAtTile(preset,x,y,options={}){
  if(!game||!lastLayout)return 0;
  const index=y*game.map.width+x;
  if(x<0||y<0||x>=game.map.width||y>=game.map.height||game.visible[index]!==1)return 0;
  const point=tileScreenPoint(x,y);
  return particles.emit(preset,point.x,point.y,{...options,worldBound:true,tileX:x,tileY:y});
}

function currentTileLabel() {
  const feature = game.features.find((entry) => !entry.used && entry.x === game.player.x && entry.y === game.player.y);
  if (feature?.type === "shop") return "A trader tends a small blue flame. Press E to browse.";
  if (feature?.type === "treasure") return "A sealed cache is buried here. Press E to open it.";
  if (feature?.type === "event") return "The air shifts around a strange presence. Press E.";
  if (game.player.x === game.map.stairs.x && game.player.y === game.map.stairs.y) return game.floor === game.maxFloors ? "The Vault Warden guards the final stair." : "The stair descends. Press Enter or DESCEND.";
  if (game.enemies.some((enemy) => enemy.alive && Math.abs(enemy.x-game.player.x)+Math.abs(enemy.y-game.player.y)===1)) return "A threat is close. Step into it to strike.";
  return "WASD / arrows to move · E interact · I pack · Space wait";
}

function renderLog() {
  if (!game || game.log.length === lastLogLength) return;
  lastLogLength = game.log.length;
  ui.log.replaceChildren();
  for (const entry of game.log.slice(-9).reverse()) {
    const line = document.createElement("li");
    line.className = entry.type;
    line.textContent = entry.text;
    ui.log.append(line);
  }
}

function renderGame() {
  if (!game) return;
  resizeCanvas(ui.gameCanvas);
  const context = ui.gameCanvas.getContext("2d", { alpha: false });
  lastLayout=drawGame(context,game,ui.gameCanvas.width,ui.gameCanvas.height,{drawCharacter:false});
  resizeCanvas(ui.particleCanvas);
  resizeCanvas(ui.minimap);
  drawMinimap(ui.minimap.getContext("2d", { alpha: false }), game, ui.minimap.width, ui.minimap.height);

  ui.floorTitle.textContent = `Cinder Vault · Floor ${roman(game.floor)}`;
  $("#player-title").textContent=game.player.name;
  $("#player-class-label").textContent=`${game.player.character.className} · ${game.player.character.passiveName}`;
  ui.floorSubtitle.textContent = `THE CINDER VAULT · ${game.mutator.name.toUpperCase()}`;
  ui.runSeed.textContent = game.seed;
  ui.runScore.textContent = String(game.status === "playing" ? getRunSummary(game).score : game.score);
  ui.turn.textContent = `TURN ${game.turn}`;
  ui.hp.textContent = `${game.player.hp} / ${game.player.maxHp}`;
  ui.hpMeter.style.width = `${Math.max(0, Math.min(100, 100 * game.player.hp / game.player.maxHp))}%`;
  ui.xp.textContent = `${game.player.xp} / ${game.player.level * 18} XP`;
  ui.gold.textContent = `◈ ${game.player.gold}`;
  ui.level.textContent = `LV ${game.player.level}`;
  ui.attack.textContent = String(game.player.attack);
  ui.defense.textContent = String(game.player.defense);
  ui.crit.textContent = `${Math.round(game.player.crit * 100)}%`;
  ui.enemyCount.textContent = `${game.enemies.filter((enemy) => enemy.alive && game.visible[enemy.y*game.map.width+enemy.x]).length} THREATS`;
  ui.visibility.textContent = `${game.explored.reduce((sum,value)=>sum+value,0)} / ${game.map.width*game.map.height} CELLS CHARTED`;
  setLocation(currentTileLabel());
  renderLog();
  renderModal();
  if (game.status !== "playing") finishRun();
}

function roman(number) {
  return ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"][number-1] ?? String(number);
}

function closeModal() {
  modalMode = null;
  if (ui.modal) ui.modal.classList.add("is-hidden");
}

function itemStatLabels(item){
  return [["attack","ATK"],["defense","DEF"],["maxHp","MAX HP"],["crit","CRIT"],["speed","DODGE"],["vision","VISION"],["lifeSteal","LIFESTEAL"],["thorns","THORNS"],["reach","REACH"],["heal","HEAL"]]
    .filter(([stat])=>Number(item[stat]??0)!==0)
    .map(([stat,label])=>`${label} +${["crit","speed","lifeSteal"].includes(stat)?`${Math.round(item[stat]*100)}%`:item[stat]}`);
}

function itemTooltip(item){
  const rarity=getRarity(item.rarity);
  const targetSlot=item.slot==="ring"?selectedRingSlot:item.slot;
  const comparison=["weapon","armor","helmet","boots","ring","amulet"].includes(item.slot)?compareWithEquipped(game.player,item,targetSlot):null;
  const changes=comparison?.current?comparison.changes.map((change)=>`${change.delta>0?"+":""}${change.delta} ${change.stat}`).join(", "):"no equipped comparison";
  return `${item.name} · ${rarity.labelPt} · ${item.slot}\n${itemStatLabels(item).join(" · ")||"No direct stat bonus"}\n${changes}${item.quantity>1?`\nQuantity: ${item.quantity}`:""}`;
}

function renderInventory(){
  const content=document.createElement("div");content.className="modal-content inventory-screen";
  const header=document.createElement("div");header.className="inventory-summary";
  const capacity=document.createElement("span");capacity.textContent=`PACK ${game.player.inventory.length} / ${INVENTORY_CAPACITY}`;
  const currency=document.createElement("strong");currency.textContent=`◈ ${game.player.gold}`;header.append(capacity,currency);content.append(header);
  if(inventoryNotice){const notice=document.createElement("p");notice.className="inventory-notice";notice.textContent=inventoryNotice;content.append(notice);}
  const characterView=document.createElement("div");characterView.className="inventory-character-view";
  const characterCanvas=document.createElement("canvas");characterCanvas.className="inventory-character-preview";characterCanvas.setAttribute("aria-label","Equipped character preview");
  const characterCaption=document.createElement("div");characterCaption.textContent=`${game.player.character.name} · ${game.player.character.className}`;
  characterView.append(characterCanvas,characterCaption);content.append(characterView);

  const slotGrid=document.createElement("div");slotGrid.className="equipment-grid";
  for(const slot of EQUIPMENT_SLOTS){
    const item=game.player.equipment[slot.id];const cell=document.createElement("div");cell.className="equipment-slot";
    const label=document.createElement("span");label.className="slot-label";label.textContent=slot.label;
    const name=document.createElement("span");name.className=`slot-item ${item?`rarity-${item.rarity}`:"empty"}`;name.textContent=item?item.name:"Empty";name.title=item?itemTooltip(item):"Empty slot";
    cell.append(label,name);
    if(item){const actions=document.createElement("div");actions.className="slot-actions";const remove=document.createElement("button");remove.type="button";remove.className="slot-remove";remove.textContent="PACK";remove.disabled=game.player.inventory.length>=INVENTORY_CAPACITY;remove.addEventListener("click",()=>runAction({type:"unequip",slot:slot.id}));const drop=document.createElement("button");drop.type="button";drop.className="slot-drop";drop.textContent="DROP";drop.addEventListener("click",()=>runAction({type:"drop_equipment",slot:slot.id}));actions.append(remove,drop);cell.append(actions);}
    slotGrid.append(cell);
  }
  content.append(slotGrid);

  const stats=document.createElement("div");stats.className="character-stats";
  const statsValues=[["HP",`${game.player.hp} / ${game.player.maxHp}`],["ATK",game.player.attack],["DEF",game.player.defense],["CRIT",`${Math.round(game.player.crit*100)}%`],["DODGE",`${Math.round(game.player.speed*8)}%`],["VISION",8+game.player.vision],["REACH",1+Math.floor(game.player.reach)],["LIFESTEAL",`${Math.round(game.player.lifeSteal*100)}%`],["THORNS",game.player.thorns]];
  for(const [label,value]of statsValues){const cell=document.createElement("span");cell.textContent=`${label} ${value}`;stats.append(cell);}
  content.append(stats);

  const packTitle=document.createElement("p");packTitle.className="pack-title";packTitle.textContent="PACK · SELECT AN ITEM FOR ACTIONS";content.append(packTitle);
  const grid=document.createElement("div");grid.className="inventory-grid";
  for(let index=0;index<INVENTORY_CAPACITY;index++){
    const item=game.player.inventory[index];const cell=document.createElement("button");cell.type="button";cell.className=`inventory-cell ${item?`rarity-border-${item.rarity}`:"empty"} ${item?.id===selectedInventoryId?"selected":""}`;
    cell.disabled=!item;cell.title=item?itemTooltip(item):`Empty slot ${index+1}`;
    const indexLabel=document.createElement("span");indexLabel.className="cell-index";indexLabel.textContent=String(index+1).padStart(2,"0");cell.append(indexLabel);
    if(item){const name=document.createElement("span");name.className=`cell-name rarity-${item.rarity}`;name.textContent=item.name;cell.append(name);if(item.quantity>1){const qty=document.createElement("b");qty.className="stack-count";qty.textContent=`×${item.quantity}`;cell.append(qty);}
      cell.addEventListener("click",()=>{selectedInventoryId=item.id;inventoryNotice="";renderModal();});}
    else{const empty=document.createElement("span");empty.className="cell-empty";empty.textContent="—";cell.append(empty);}
    grid.append(cell);
  }
  content.append(grid);

  const selected=game.player.inventory.find((item)=>item.id===selectedInventoryId)??game.player.inventory[0];
  selectedInventoryId=selected?.id??null;
  if(selected){
    const detail=document.createElement("section");detail.className="item-detail";
    const title=document.createElement("h3");title.className=`item-name rarity-${selected.rarity}`;title.textContent=selected.name;detail.append(title);
    const statsList=document.createElement("div");statsList.className="item-attributes";statsList.textContent=itemStatLabels(selected).join(" · ")||`Stack ×${selected.quantity??1}`;detail.append(statsList);
    if(["weapon","armor","helmet","boots","ring","amulet"].includes(selected.slot)){
      let selectedSlot=selected.slot;
      if(selected.slot==="ring"){
        const select=document.createElement("select");select.className="ring-slot-select";
        for(const id of ["ring1","ring2"]){const option=document.createElement("option");option.value=id;option.textContent=id==="ring1"?"Ring I":"Ring II";select.append(option);}
        select.value=selectedRingSlot;select.addEventListener("change",()=>{selectedRingSlot=select.value;renderModal();});detail.append(select);selectedSlot=selectedRingSlot;
      }
      const comparison=compareWithEquipped(game.player,selected,selectedSlot);
      if(comparison.current){const compare=document.createElement("div");compare.className="comparison-list";const compareHeading=document.createElement("span");compareHeading.textContent=`Compared with ${comparison.current.name}`;compare.append(compareHeading);
        for(const change of comparison.changes){const line=document.createElement("span");line.className=change.delta>0?"better":change.delta<0?"worse":"even";line.textContent=`${change.stat}: ${change.current} → ${change.candidate}`;compare.append(line);}detail.append(compare);}
      else{const compare=document.createElement("p");compare.className="item-stats";compare.textContent="No item equipped in this slot.";detail.append(compare);}
      const equip=document.createElement("button");equip.type="button";equip.className="secondary-button";equip.textContent=`EQUIP${selected.slot==="ring"?` ${selectedSlot.toUpperCase()}`:""}`;equip.addEventListener("click",()=>runAction({type:"equip",itemId:selected.id,slot:selectedSlot}));detail.append(equip);
    }
    if(selected.slot==="consumable"){const use=document.createElement("button");use.type="button";use.className="secondary-button";use.textContent="USE";use.addEventListener("click",()=>runAction({type:"use",itemId:selected.id}));detail.append(use);}
    const discard=document.createElement("button");discard.type="button";discard.className="discard-button";discard.textContent=`DISCARD ${isStackable(selected)&&selected.quantity>1?"ONE":"ITEM"}`;discard.addEventListener("click",()=>runAction({type:"discard",itemId:selected.id}));detail.append(discard);
    content.append(detail);
  }
  ui.modalTitle.textContent=`${game.player.name} · Character & Pack`;
  ui.modalEyebrow.textContent=`${game.player.character.className} · EQUIPMENT + ${INVENTORY_CAPACITY} PACK SLOTS`;
  ui.modalContent.replaceChildren(content);ui.modal.classList.remove("is-hidden");
  characterRenderer.renderPreview(characterCanvas,game.player.character,game.player.equipment);
}

function renderGameOverlay() {
  const overlay = game.overlay;
  const content = document.createElement("div"); content.className = "modal-content";
  if (overlay.type === "shop") {
    ui.modalTitle.textContent = "The Ember Trader";
    ui.modalEyebrow.textContent = `FLOOR ${roman(game.floor)} · ◈ ${game.player.gold} GOLD`;
    const intro = document.createElement("p"); intro.textContent = "The blue flame holds still while you bargain."; content.append(intro);
    for (const offer of overlay.stock) {
      if (offer.sold) continue;
      const row = document.createElement("div"); row.className = "shop-offer";
      const label = document.createElement("span"); label.className = `item-name ${offer.item.rarity}`; label.textContent = `${offer.item.name} · ${itemShortStats(offer.item)}`;
      const button = document.createElement("button"); button.textContent = `BUY ◈ ${offer.cost}`; button.disabled = game.player.gold < offer.cost || game.player.inventory.length >= INVENTORY_CAPACITY;
      button.addEventListener("click", () => runAction({ type: "buy", itemId: offer.item.id }));
      row.append(label, button); content.append(row);
    }
  } else if (overlay.type === "event") {
    ui.modalTitle.textContent = overlay.event.title;
    ui.modalEyebrow.textContent = `A CHOICE · FLOOR ${roman(game.floor)}`;
    const description = document.createElement("p"); description.textContent = overlay.event.description; content.append(description);
    for (const choice of overlay.event.choices) {
      const button = document.createElement("button"); button.className = "modal-choice"; button.textContent = choice.label;
      button.addEventListener("click", () => runAction({ type: "choose", choiceId: choice.id })); content.append(button);
    }
  }
  ui.modalContent.replaceChildren(content);
  ui.modal.classList.remove("is-hidden");
}

function itemShortStats(item) {
  return itemStatLabels(item).join(" ") || (item.quantity>1?`STACK ×${item.quantity}`:item.slot.toUpperCase());
}

function renderModal() {
  if (!game) { closeModal(); return; }
  if (game.overlay) renderGameOverlay();
  else if (modalMode === "inventory") renderInventory();
  else if (modalMode !== "custom") closeModal();
}

function runAction(intent) {
  if(!game)return;
  const sourceMap=game.map;const oldHp=game.player.hp;const oldX=game.player.x;const oldY=game.player.y;
  const oldDrops=new Map(game.drops.map((drop)=>[drop.entityId??drop.id,{collected:drop.collected,x:drop.x,y:drop.y}]));
  const oldEnemies=new Map(game.enemies.map((enemy)=>[enemy.id,{hp:enemy.hp,alive:enemy.alive,x:enemy.x,y:enemy.y,type:enemy.type}]));
  const candidate=intent.type==="equip"?game.player.inventory.find((item)=>item.id===intent.itemId):null;
  const result=performAction(game,intent);
  if(game.player.x!==oldX||game.player.y!==oldY)walkingUntil=performance.now()+220;
  if(!result.ok&&result.reason){inventoryNotice=result.reason;setLocation(result.reason);}else inventoryNotice="";
  if(result.ok){
    if(intent.type==="move")playSound("step");
    if(intent.type==="attack"||intent.type==="move"&&game.log.at(-1)?.type==="combat")playSound("hit");
    if(intent.type==="buy"||intent.type==="interact")playSound("chime");
  }
  const playerDamage=oldHp-game.player.hp;
  if(playerDamage>0){flashUntil=performance.now()+180;triggerShake();showDamage(`−${playerDamage}`,"#ef8c74");playSound("hurt");}
  renderGame();
  if(game.map!==sourceMap)return;
  for(const drop of game.drops){
    const previous=oldDrops.get(drop.entityId??drop.id);
    if(!previous)emitAtTile("dropBurst",drop.x,drop.y,{color:drop.item?.color,intensity:Math.max(.3,getRarity(drop.item?.rarity).glow)});
    if(drop.collected&&(!previous||!previous.collected)){
      const origin=tileScreenPoint(drop.x,drop.y);const target=tileScreenPoint(game.player.x,game.player.y);
      if(origin&&target)particles.emit("pickup",origin.x,origin.y,{color:drop.item?.color??"#e0bd71",targetX:target.x,targetY:target.y,worldBound:true,tileX:drop.x,tileY:drop.y});
      playSound("pickup");
    }
  }
  for(const enemy of game.enemies){
    const before=oldEnemies.get(enemy.id);if(!before)continue;
    const point=tileScreenPoint(before.x,before.y);if(!point)continue;
    const dealt=before.hp-enemy.hp;
    if(dealt>0){const color=before.type==="mourning-wraith"?"#88d6e4":before.type==="vault-warden"?"#ffc45f":"#e07862";emitAtTile("combatHit",before.x,before.y,{color});showDamage(`−${dealt}`,color,point);}
    if(before.alive&&!enemy.alive)emitAtTile("enemyDeath",before.x,before.y,{color:before.type==="vault-warden"?"#ffc45f":before.type==="mourning-wraith"?"#88d6e4":"#d88163"});
  }
  if(playerDamage>0)emitAtTile("combatHit",game.player.x,game.player.y,{color:"#ef806c",count:12});
  if(result.ok&&intent.type==="equip"&&candidate){
    const point=tileScreenPoint(game.player.x,game.player.y);
    if(point)particles.emit("equipAura",point.x,point.y,{color:candidate.color??getRarity(candidate.rarity).color,worldBound:true,tileX:game.player.x,tileY:game.player.y});
    playSound("equip");
  }
}

function triggerShake() {
  ui.gameCanvas.classList.remove("shake");
  void ui.gameCanvas.offsetWidth;
  ui.gameCanvas.classList.add("shake");
}

function showDamage(text,color,point){
  const number=document.createElement("span");number.className="damage-number";number.textContent=text;number.style.color=color;
  number.style.left=point?`${Math.max(2,Math.min(90,100*point.x/ui.gameCanvas.width))}%`:`${44+((game?.turn??0)%3)*4}%`;
  number.style.top=point?`${Math.max(2,Math.min(85,100*point.y/ui.gameCanvas.height))}%`:`${42+((game?.turn??0)%2)*5}%`;
  ui.damageLayer.append(number);
  number.addEventListener("animationend", () => number.remove(), { once: true });
}

function ensureAudio() {
  if (!soundEnabled) return null;
  try {
    const AudioCtor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!AudioCtor) return null;
    if (!audioContext) audioContext = new AudioCtor();
    if (audioContext.state === "suspended") audioContext.resume();
    return audioContext;
  } catch {
    return null;
  }
}

function playSound(kind) {
  const audio = ensureAudio();
  if (!audio) return;
  const now = audio.currentTime;
  const presets = { step:[110,.035,"sine",.045], hit:[78,.09,"triangle",.11], hurt:[58,.16,"sawtooth",.13], chime:[620,.12,"sine",.07], pickup:[880,.11,"sine",.06], equip:[470,.2,"triangle",.07], start:[280,.3,"triangle",.06], death:[95,.35,"sawtooth",.08], win:[520,.45,"sine",.07] };
  const [frequency,duration,wave,volume] = presets[kind] ?? presets.step;
  const oscillator=audio.createOscillator(); const gain=audio.createGain();
  oscillator.type=wave; oscillator.frequency.setValueAtTime(frequency,now);
  if (kind === "win") oscillator.frequency.exponentialRampToValueAtTime(1040,now+duration);
  if (kind === "death") oscillator.frequency.exponentialRampToValueAtTime(35,now+duration);
  gain.gain.setValueAtTime(volume,now); gain.gain.exponentialRampToValueAtTime(.001,now+duration);
  oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(now); oscillator.stop(now+duration);
}

function finishRun() {
  if (game.profileRecorded) return;
  game.profileRecorded = true;
  const summary = getRunSummary(game);
  const previousBest = profile.bestScore;
  profile = recordRun(profile, summary);
  const saved = saveProfile(profile);
  populateMutators();
  $("#end-eyebrow").textContent = summary.status === "victory" ? "THE VAULT REMEMBERS" : "THE VAULT CLOSES";
  $("#end-title").innerHTML = summary.status === "victory" ? "THE DEEP<br /><span>YIELDS.</span>" : "THE ASHES<br /><span>KEEP YOU.</span>";
  $("#end-copy").textContent = summary.status === "victory" ? "You carry the Warden's ember back into the cold city." : "The vault keeps what it was owed. Another seed waits above.";
  $("#end-score").textContent = String(summary.score);
  $("#end-floor").textContent = `${summary.floor} / ${game.maxFloors}`;
  $("#end-kills").textContent = String(summary.kills);
  $("#record-message").textContent = saved ? (summary.score > previousBest ? "New record sealed in this browser." : "Progress saved locally.") : "Local storage unavailable; this run's record was not saved.";
  showScreen("end");
  playSound(summary.status === "victory" ? "win" : "death");
}

function toggleInventory() {
  if (!game || game.status !== "playing") return;
  if (game.overlay) return;
  modalMode = modalMode === "inventory" ? null : "inventory";
  renderModal();
}

function handleMove(dx,dy) {
  if (modalMode === "inventory") closeModal();
  runAction({ type: "move", dx, dy });
}

function playFromCanvas(event) {
  if (!game || game.status !== "playing" || game.overlay || modalMode) return;
  const target = screenToTile(ui.gameCanvas,game.map,event.clientX,event.clientY);
  if (!target || game.visible[target.y*game.map.width+target.x] !== 1) return;
  const aimedEnemy=game.enemies.find((enemy)=>enemy.alive&&enemy.x===target.x&&enemy.y===target.y);
  if(aimedEnemy&&Math.abs(aimedEnemy.x-game.player.x)+Math.abs(aimedEnemy.y-game.player.y)<=1+Math.floor(game.player.reach)){runAction({type:"attack",targetId:aimedEnemy.id});return;}
  const path = findPath(game.map,game.player,target);
  if (path.length < 2) return;
  const next=path[1];
  handleMove(next.x-game.player.x,next.y-game.player.y);
}

function renderEndToMenu() {
  game = null;
  showScreen("menu");
  populateMutators();
}

ui.startForm.addEventListener("submit",(event)=>{event.preventDefault();openCharacterCreation(ui.menuSeed.value);});
$("#random-seed").addEventListener("click",()=>{ui.menuSeed.value=randomWorldSeed();ui.menuSeed.focus();});
$("#daily-button").addEventListener("click",()=>openCharacterCreation(dailySeed()));
$("#again-button").addEventListener("click",renderEndToMenu);
ui.characterForm.addEventListener("submit",(event)=>{event.preventDefault();beginRun(pendingSeed,readCharacterDraft());});
$("#character-back").addEventListener("click",()=>showScreen("menu"));
$("#character-random").addEventListener("click",()=>{
  const generated=randomCharacter(new Rng(`appearance:${randomWorldSeed()}`));
  ui.characterName.value=generated.name;ui.classSelect.value=generated.classId;
  for(const key of ["skin","hairStyle","hairColor","faceStyle","outfitColor"])fillAppearanceSelect(key,APPEARANCE_OPTIONS[key],generated.appearance[key]);
  renderCharacterDraft();
});
ui.characterForm.addEventListener("input",renderCharacterDraft);
ui.characterForm.addEventListener("change",renderCharacterDraft);
$("#brand-home").addEventListener("click",()=>{if(!game||game.status!=="playing")renderEndToMenu();});
$("#interact-button").addEventListener("click",()=>runAction({type:"interact"}));
$("#wait-button").addEventListener("click",()=>runAction({type:"wait"}));
$("#pack-button").addEventListener("click",toggleInventory);
$("#stairs-button").addEventListener("click",()=>runAction({type:"descend"}));
$("#abandon-button").addEventListener("click",()=>{ if(game?.status==="playing") runAction({type:"abandon"}); });
$("#modal-close").addEventListener("click",()=>{
  if(game?.overlay) runAction({type:"close"});
  modalMode=null; renderModal();
});
$("#sound-button").addEventListener("click",(event)=>{
  soundEnabled=!soundEnabled; event.currentTarget.textContent=soundEnabled?"SOUND ON":"SOUND OFF"; event.currentTarget.setAttribute("aria-pressed",String(soundEnabled));
  if(soundEnabled) playSound("chime");
});
ui.gameCanvas.addEventListener("click",playFromCanvas);
for(const button of document.querySelectorAll("[data-move]")) button.addEventListener("click",()=>{
  const [dx,dy]=button.dataset.move.split(",").map(Number); handleMove(dx,dy);
});
window.addEventListener("keydown",(event)=>{
  if(!game||game.status!=="playing")return;
  const target=event.target;
  if(target instanceof HTMLElement && (target.isContentEditable||["INPUT","SELECT","TEXTAREA"].includes(target.tagName))) {
    if(event.key!=="Escape")return;
  }
  if(target instanceof HTMLButtonElement && ["Enter"," "].includes(event.key)) return;
  if((game.overlay||modalMode)&&event.key!=="Escape")return;
  const movement={ArrowUp:[0,-1],w:[0,-1],W:[0,-1],ArrowRight:[1,0],d:[1,0],D:[1,0],ArrowDown:[0,1],s:[0,1],S:[0,1],ArrowLeft:[-1,0],a:[-1,0],A:[-1,0]};
  if(movement[event.key]){event.preventDefault();handleMove(...movement[event.key]);return;}
  if(event.key.toLowerCase()==="e"){event.preventDefault();runAction({type:"interact"});return;}
  if(event.key===" "){event.preventDefault();runAction({type:"wait"});return;}
  if(event.key==="Enter"){event.preventDefault();runAction({type:"descend"});return;}
  if(event.key.toLowerCase()==="i"){event.preventDefault();toggleInventory();return;}
  if(event.key==="Escape"){
    if(game.overlay)runAction({type:"close"});
    else closeModal();
  }
});
let frameTime=0;let ambienceTimer=0;let dropTimer=0;let stairTimer=0;
function animateVisuals(timestamp){
  requestAnimationFrame(animateVisuals);
  const dt=frameTime?Math.min(.05,(timestamp-frameTime)/1000):0;frameTime=timestamp;
  particles.update(dt);
  const active=game&&game.status==="playing"&&!ui.game.classList.contains("is-hidden");
  if(!active||!lastLayout){particleContext.clearRect(0,0,ui.particleCanvas.width,ui.particleCanvas.height);return;}
  resizeCanvas(ui.particleCanvas);particleContext.clearRect(0,0,ui.particleCanvas.width,ui.particleCanvas.height);
  const tileSize=lastLayout.tileSize;
  characterRenderer.draw(particleContext,lastLayout.playerX,lastLayout.playerY,tileSize*1.35,game.player.character,game.player.equipment,{direction:game.player.facing,moving:timestamp<walkingUntil,time:timestamp,flash:timestamp<flashUntil ? 0.6 : 0});
  ambienceTimer+=dt;dropTimer+=dt;stairTimer+=dt;
  if(ambienceTimer>=(visualOptions.reducedEffects?1.1:.34)){
    ambienceTimer=0;const candidates=[];
    for(let y=0;y<game.map.height;y+=1)for(let x=0;x<game.map.width;x+=1){const index=y*game.map.width+x;if(game.visible[index]&&game.map.tiles[index]!==TILE.WALL)candidates.push({x,y});}
    if(candidates.length){const cell=visualRng.pick(candidates);emitAtTile("ambientEmber",cell.x,cell.y,{color:visualRng.chance(.45)?"#e7a96b":"#8fc5a8",count:visualOptions.reducedEffects?1:2});}
  }
  if(dropTimer>=(visualOptions.reducedEffects ? 0.5 : 0.2)){
    dropTimer=0;
    for(const drop of game.drops){if(!drop.collected&&game.visible[drop.y*game.map.width+drop.x])emitAtTile("dropSpark",drop.x,drop.y,{color:drop.item.color,intensity:visualOptions.reducedEffects ? 0.45 : 0.75});}
  }
  if(stairTimer>=(visualOptions.reducedEffects ? 0.45 : 0.18)){
    stairTimer=0;const stairs=game.map.stairs;if(game.visible[stairs.y*game.map.width+stairs.x])emitAtTile("stairSpiral",stairs.x,stairs.y,{color:"#dba35d",count:visualOptions.reducedEffects?1:2});
  }
  particles.draw(particleContext,{isVisible:(x,y)=>Number.isInteger(x)&&Number.isInteger(y)&&game.visible[y*game.map.width+x]===1});
}
requestAnimationFrame(animateVisuals);
window.addEventListener("resize",()=>{if(game&&ui.game.classList.contains("is-hidden")===false)renderGame();if(!ui.character.classList.contains("is-hidden"))renderCharacterDraft();},{passive:true});
ui.reducedEffects.addEventListener("change",()=>{
  visualOptions={...visualOptions,reducedEffects:ui.reducedEffects.checked};
  particles.setReducedMotion(visualOptions.reducedEffects);
  saveOptions(visualOptions);
});
populateMutators();
