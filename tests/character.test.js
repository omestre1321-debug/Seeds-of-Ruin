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
    assert.equal(character.className,definition.name);
    assert.deepEqual(character.stats,definition.stats);
    assert.equal(character.startingWeapon.visualId,definition.startingWeapon.visualId);
    assert.equal(character.passiveId,definition.passiveId);
  }
});

test("appearance validation accepts and normalizes every data-defined combination",()=>{
  const {skin:skins,hairStyle:hairstyles,hairColor:hairColors,faceStyle:faces,outfitColor:outfits}=APPEARANCE_OPTIONS;
  for(const skin of skins)for(const hairstyle of hairstyles)for(const hair of hairColors)for(const face of faces)for(const outfit of outfits){
    const character=createCharacter({name:"  Ash Runner  ",classId:"wayfinder",appearance:{skin:skin.id,hairStyle:hairstyle.id,hairColor:hair.id,faceStyle:face.id,outfitColor:outfit.id}});
    assert.equal(character.name,"Ash Runner");
    assert.deepEqual(character.appearance,{skin:skin.id,hairStyle:hairstyle.id,hairColor:hair.id,faceStyle:face.id,outfitColor:outfit.id});
    assert.equal(character.startingWeapon.slot,"weapon");
  }
  const fallback=sanitizeCharacter({name:"!!!",classId:"missing",appearance:{skin:"bad"}});
  assert.equal(fallback.name,"Delver");
  assert.equal(fallback.classId,"vanguard");
});

test("random character choices are deterministic and do not alter dungeon seed",()=>{
  const one=randomCharacter(new Rng("looks"));
  const two=randomCharacter(new Rng("looks"));
  assert.deepEqual(one,two);
  const appearanceA=createCharacter({name:"One",classId:"vanguard",appearance:{skin:"copper"}});
  const appearanceB=createCharacter({name:"Two",classId:"emberAdept",appearance:{skin:"moon"}});
  const mapA=createGame("same-world",{}, {character:appearanceA}).map;
  const mapB=createGame("same-world",{}, {character:appearanceB}).map;
  assert.equal(dungeonSignature(mapA),dungeonSignature(mapB));
});
