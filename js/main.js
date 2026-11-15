import { createGame, getRunSummary, performAction } from "./core/game.js";
import { dailySeed, Rng } from "./core/rng.js";
import { findPath } from "./core/pathfinding.js";
import { MUTATORS } from "./core/mutators.js";
import { recordRun, sanitizeProfile, selectMutator } from "./core/progression.js";
import { loadProfile, saveProfile } from "./utils/storage.js";
import { drawGame, drawMinimap, screenToTile } from "./render/dungeon-renderer.js";

const $ = (selector) => document.querySelector(selector);
const ui = {
  menu: $("#menu-screen"), game: $("#game-screen"), end: $("#end-screen"),
  menuSeed: $("#seed-input"), mutator: $("#mutator-select"), startForm: $("#start-form"),
  gameCanvas: $("#game-canvas"), minimap: $("#minimap"), damageLayer: $("#damage-layer"),
  modal: $("#modal-root"), modalTitle: $("#modal-title"), modalEyebrow: $("#modal-eyebrow"), modalContent: $("#modal-content"),
  floorTitle: $("#floor-title"), floorSubtitle: $("#floor-subtitle"), runSeed: $("#run-seed"), runScore: $("#run-score"),
  turn: $("#turn-label"), location: $("#location-label"), hp: $("#hp-label"), hpMeter: $("#hp-meter"),
  xp: $("#xp-label"), gold: $("#gold-label"), level: $("#level-label"), attack: $("#attack-label"), defense: $("#defense-label"), crit: $("#crit-label"),
  log: $("#combat-log"), enemyCount: $("#enemy-count"), visibility: $("#visibility-label"),
};

let profile = loadProfile();
let game = null;
let modalMode = null;
let audioContext = null;
let soundEnabled = true;
let lastLogLength = 0;

function randomSeed() {
  const bytes = new Uint32Array(1);
  if (globalThis.crypto?.getRandomValues) globalThis.crypto.getRandomValues(bytes);
  else bytes[0] = Date.now() >>> 0;
  return `ASH-${bytes[0].toString(16).toUpperCase().padStart(8, "0")}`;
}

function showScreen(name) {
  ui.menu.classList.toggle("is-hidden", name !== "menu");
  ui.game.classList.toggle("is-hidden", name !== "game");
  ui.end.classList.toggle("is-hidden", name !== "end");
  if (name !== "game") closeModal();
}

function saveProgress() {
  const saved = saveProfile(profile);
  if (!saved) setLocation("Local progress could not be saved; this run remains playable.");
}

function populateMutators() {
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

function beginRun(seedValue) {
  const seed = String(seedValue || "ASH-001").trim().slice(0, 32) || "ASH-001";
  const selection = selectMutator(profile, ui.mutator.value);
  profile = selection.profile;
  saveProgress();
  game = createGame(seed, profile, { maxFloors: 4, mutator: profile.selectedMutator });
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
  drawGame(context, game, ui.gameCanvas.width, ui.gameCanvas.height);
  resizeCanvas(ui.minimap);
  drawMinimap(ui.minimap.getContext("2d", { alpha: false }), game, ui.minimap.width, ui.minimap.height);

  ui.floorTitle.textContent = `Cinder Vault · Floor ${roman(game.floor)}`;
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

function makeItemRow(item, equipped) {
  const row = document.createElement("div");
  row.className = "item-row";
  const copy = document.createElement("div"); copy.className = "item-copy";
  const title = document.createElement("span"); title.className = `item-name ${item.rarity}`; title.textContent = `${item.name}${equipped ? " · EQUIPPED" : ""}`;
  const stats = document.createElement("span"); stats.className = "item-stats";
  stats.textContent = [item.attack ? `ATK +${item.attack}` : "", item.defense ? `DEF +${item.defense}` : "", item.crit ? `CRIT +${Math.round(item.crit*100)}%` : "", item.heal ? `HEAL ${item.heal}` : ""].filter(Boolean).join(" · ") || item.slot.toUpperCase();
  copy.append(title, stats); row.append(copy);
  const actions = document.createElement("div"); actions.className = "item-actions";
  if (["weapon", "armor", "charm"].includes(item.slot)) {
    const button = document.createElement("button"); button.textContent = equipped ? "ON" : "EQUIP"; button.disabled = equipped;
    button.addEventListener("click", () => runAction({ type: "equip", itemId: item.id })); actions.append(button);
  } else if (item.slot === "consumable") {
    const button = document.createElement("button"); button.textContent = "USE";
    button.addEventListener("click", () => { closeModal(); runAction({ type: "use", itemId: item.id }); }); actions.append(button);
  }
  row.append(actions);
  return row;
}

function renderInventory() {
  const content = document.createElement("div"); content.className = "modal-content";
  const summary = document.createElement("p"); summary.textContent = `Gold ${game.player.gold} · ${game.player.inventory.length} / 12 slots`;
  content.append(summary);
  if (game.player.inventory.length === 0) {
    const empty = document.createElement("p"); empty.textContent = "Your pack is empty."; content.append(empty);
  }
  for (const item of game.player.inventory) {
    const equipped = Object.values(game.player.equipment).includes(item.id);
    content.append(makeItemRow(item, equipped));
  }
  ui.modalTitle.textContent = "Your pack";
  ui.modalEyebrow.textContent = "INVENTORY & EQUIPMENT";
  ui.modalContent.replaceChildren(content);
  ui.modal.classList.remove("is-hidden");
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
      const button = document.createElement("button"); button.textContent = `BUY ◈ ${offer.cost}`; button.disabled = game.player.gold < offer.cost || game.player.inventory.length >= 12;
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
  return [item.attack ? `ATK+${item.attack}` : "", item.defense ? `DEF+${item.defense}` : "", item.crit ? `CRIT+${Math.round(item.crit*100)}%` : "", item.heal ? `HEAL ${item.heal}` : ""].filter(Boolean).join(" ");
}

function renderModal() {
  if (!game) { closeModal(); return; }
  if (game.overlay) renderGameOverlay();
  else if (modalMode === "inventory") renderInventory();
  else if (modalMode !== "custom") closeModal();
}

function runAction(intent) {
  if (!game) return;
  const oldHp = game.player.hp;
  const result = performAction(game, intent);
  if (!result.ok && result.reason) setLocation(result.reason);
  if (result.ok) {
    if (intent.type === "move") playSound("step");
    if (intent.type === "attack" || intent.type === "move" && game.log.at(-1)?.type === "combat") playSound("hit");
    if (intent.type === "buy" || intent.type === "interact") playSound("chime");
  }
  const damage = oldHp - game.player.hp;
  if (damage > 0) {
    triggerShake(); showDamage(`−${damage}`, "#ef8c74"); playSound("hurt");
  }
  renderGame();
}

function triggerShake() {
  ui.gameCanvas.classList.remove("shake");
  void ui.gameCanvas.offsetWidth;
  ui.gameCanvas.classList.add("shake");
}

function showDamage(text, color) {
  const number = document.createElement("span");
  number.className = "damage-number"; number.textContent = text; number.style.color = color;
  number.style.left = `${44 + ((game?.turn ?? 0) % 3) * 4}%`; number.style.top = `${42 + ((game?.turn ?? 0) % 2) * 5}%`;
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
  const presets = { step:[110,.035,"sine",.045], hit:[78,.09,"triangle",.11], hurt:[58,.16,"sawtooth",.13], chime:[620,.12,"sine",.07], start:[280,.3,"triangle",.06], death:[95,.35,"sawtooth",.08], win:[520,.45,"sine",.07] };
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

ui.startForm.addEventListener("submit",(event)=>{event.preventDefault();beginRun(ui.menuSeed.value);});
$("#random-seed").addEventListener("click",()=>{ui.menuSeed.value=`ASH-${new Rng(`${Date.now()}-${performance.now()}`).nextUint32().toString(16).toUpperCase()}`;ui.menuSeed.focus();});
$("#daily-button").addEventListener("click",()=>beginRun(dailySeed()));
$("#again-button").addEventListener("click",renderEndToMenu);
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
window.addEventListener("resize",()=>{if(game&&ui.game.classList.contains("is-hidden")===false)renderGame();},{passive:true});
populateMutators();
