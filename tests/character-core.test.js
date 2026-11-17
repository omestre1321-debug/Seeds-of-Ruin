import test from "node:test";
import assert from "node:assert/strict";
import { createCharacter, randomCharacter, sanitizeCharacter } from "../js/core/character.js";
import { CLASSES } from "../js/data/classes.js";
import { APPEARANCE_OPTIONS } from "../js/data/appearance.js";
import { createGame } from "../js/core/game.js";
import { dungeonSignature } from "../js/core/map/bsp.js";
import { Rng } from "../js/core/rng.js";

test("every class supplies its defined starting attributes, weapon and passive",()=>{
  for(const definition of Object.values(CLASSES)){
    const character=createCharacter({name:"Test Delver",classId:definition.id});
    assert.equal(character.className,definition.name);assert.deepEqual(character.stats,definition.stats);
    assert.equal(character.startingWeapon.spriteCategory,definition.startingWeapon.spriteCategory);assert.equal(character.passiveId,definition.passiveId);
    const game=createGame("class-seed",{}, {character});
    assert.equal(game.player.classId,definition.id);assert.equal(game.player.baseAttack,definition.stats.attack);
    assert.equal(game.player.baseDefense,definition.stats.defense);assert.equal(game.player.passiveId,definition.passiveId);
    assert.equal(game.player.equipment.weapon.spriteCategory,definition.startingWeapon.spriteCategory);
  }
});

test("appearance validation accepts every data-defined combination and falls back safely",()=>{
  const {skin:skins,hairStyle:hairstyles,hairColor:hairColors,faceStyle:faces,outfitColor:outfits}=APPEARANCE_OPTIONS;
  for(const skin of skins)for(const hairstyle of hairstyles)for(const hair of hairColors)for(const face of faces)for(const outfit of outfits){
    const character=createCharacter({name:"  Ash Runner  ",classId:"wayfinder",appearance:{skin:skin.id,hairStyle:hairstyle.id,hairColor:hair.id,faceStyle:face.id,outfitColor:outfit.id}});
    assert.equal(character.name,"Ash Runner");assert.deepEqual(character.appearance,{skin:skin.id,hairStyle:hairstyle.id,hairColor:hair.id,faceStyle:face.id,outfitColor:outfit.id});
    assert.equal(character.startingWeapon.slot,"weapon");
  }
  const fallback=sanitizeCharacter({name:"!!!",classId:"missing",appearance:{skin:"bad"}});
  assert.equal(fallback.name,"Delver");assert.equal(fallback.classId,"vanguard");
});

test("random looks are deterministic and do not change a same-seed floor",()=>{
  assert.deepEqual(randomCharacter(new Rng("looks")),randomCharacter(new Rng("looks")));
  const a=createCharacter({name:"One",classId:"vanguard",appearance:{skin:"copper"}});
  const b=createCharacter({name:"Two",classId:"emberAdept",appearance:{skin:"moon"}});
  assert.equal(dungeonSignature(createGame("same-world",{}, {character:a}).map),dungeonSignature(createGame("same-world",{}, {character:b}).map));
});
