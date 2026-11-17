import { PLAYER_BODY_VARIANTS, DEFAULT_BODY_VARIANT } from "./sprite-character-visuals.js";

export const APPEARANCE_OPTIONS=Object.freeze({
  bodyVariant:PLAYER_BODY_VARIANTS.map((body)=>({id:body.id,label:body.label})),
  skin:[
    {id:"copper",label:"Copper",color:"#b56f4d",shadow:"#744432"},
    {id:"warm",label:"Warm sand",color:"#d69a70",shadow:"#9b6047"},
    {id:"umber",label:"Deep umber",color:"#744735",shadow:"#4b3029"},
    {id:"moon",label:"Moon pale",color:"#e0c2a4",shadow:"#aa8068"},
  ],
  hairStyle:[
    {id:"cropped",label:"Cropped"},
    {id:"coils",label:"Coils"},
    {id:"braided",label:"Braided"},
    {id:"swept",label:"Swept back"},
    {id:"hooded",label:"Hood"},
  ],
  faceStyle:[
    {id:"steady",label:"Steady"},
    {id:"scarred",label:"Scarred"},
    {id:"painted",label:"Ash-marked"},
    {id:"masked",label:"Half-mask"},
  ],
  hairColor:[
    {id:"coal",label:"Coal",color:"#262b29",shadow:"#151917"},
    {id:"copper",label:"Copper",color:"#b35f3e",shadow:"#713d32"},
    {id:"silver",label:"Silver",color:"#bcc4bd",shadow:"#78847d"},
    {id:"plum",label:"Plum",color:"#795c85",shadow:"#4a3e59"},
    {id:"flax",label:"Flax",color:"#d1a45d",shadow:"#8a6844"},
  ],
  outfitColor:[
    {id:"moss",label:"Moss",color:"#536e58",shadow:"#344a3d"},
    {id:"cinder",label:"Cinder",color:"#765046",shadow:"#4d3635"},
    {id:"deepTeal",label:"Deep teal",color:"#3d6f70",shadow:"#284b50"},
    {id:"plum",label:"Plum",color:"#6a526e",shadow:"#43384c"},
    {id:"ochre",label:"Ochre",color:"#a17443",shadow:"#694a35"},
  ],
});

export const DEFAULT_APPEARANCE=Object.freeze({bodyVariant:DEFAULT_BODY_VARIANT,skin:"warm",hairStyle:"swept",hairColor:"coal",faceStyle:"steady",outfitColor:"moss"});

function chooseOption(group,id) {
  return APPEARANCE_OPTIONS[group].find((option)=>option.id===id)??APPEARANCE_OPTIONS[group][0];
}

export function sanitizeAppearance(value={}) {
  return {
    bodyVariant:chooseOption("bodyVariant",value.bodyVariant).id,
    skin:chooseOption("skin",value.skin).id,
    hairStyle:chooseOption("hairStyle",value.hairStyle).id,
    hairColor:chooseOption("hairColor",value.hairColor).id,
    faceStyle:chooseOption("faceStyle",value.faceStyle).id,
    outfitColor:chooseOption("outfitColor",value.outfitColor).id,
  };
}

export function getAppearanceColors(appearance={}) {
  const normalized=sanitizeAppearance(appearance);
  const skin=chooseOption("skin",normalized.skin);
  const hair=chooseOption("hairColor",normalized.hairColor);
  const outfit=chooseOption("outfitColor",normalized.outfitColor);
  return {skin:skin.color,skinShadow:skin.shadow,hair:hair.color,hairShadow:hair.shadow,outfit:outfit.color,outfitShadow:outfit.shadow};
}
