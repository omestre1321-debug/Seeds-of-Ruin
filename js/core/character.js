import { APPEARANCE_OPTIONS, DEFAULT_APPEARANCE, sanitizeAppearance } from "../data/appearance.js";
import { CLASSES, DEFAULT_CLASS_ID } from "../data/classes.js";

export const DEFAULT_CHARACTER_NAME="Delver";
const NAME_PATTERN=/[^\p{L}\p{N} _'-]/gu;

export function sanitizeCharacter(input={}) {
  const rawName=typeof input.name==="string"?input.name:"";
  const name=rawName.replace(NAME_PATTERN,"").trim().slice(0,18)||DEFAULT_CHARACTER_NAME;
  const classId=CLASSES[input.classId]?input.classId:DEFAULT_CLASS_ID;
  const definition=CLASSES[classId];
  return {
    name,
    classId,
    className:definition.name,
    role:definition.role,
    passiveId:definition.passiveId,
    passive:{...definition.passive},
    passiveName:definition.passiveName,
    passiveDescription:definition.passiveDescription,
    stats:{...definition.stats},
    startingWeapon:{...definition.startingWeapon},
    appearance:sanitizeAppearance(input.appearance??DEFAULT_APPEARANCE),
  };
}

export function createCharacter(input={}) {
  return sanitizeCharacter(input);
}

export function randomCharacter(rng) {
  const classes=Object.keys(CLASSES);
  const choose=(key)=>rng.pick(APPEARANCE_OPTIONS[key].map((option)=>option.id));
  const nameParts=["Ash","Morrow","Sable","Wren","Cinder","Vale","Rook","Nera"];
  const name=`${rng.pick(nameParts)} ${rng.pick(nameParts)}`;
  return createCharacter({
    name,
    classId:rng.pick(classes),
    appearance:{skin:choose("skin"),hairStyle:choose("hairStyle"),hairColor:choose("hairColor"),faceStyle:choose("faceStyle"),outfitColor:choose("outfitColor")},
  });
}
