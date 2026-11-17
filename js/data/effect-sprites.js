export const EFFECT_SPRITES=Object.freeze({
  slash:Object.freeze({spriteId:"effects-0148",category:"effect_slash",duration:220,scale:1,rotation:-.55,decorative:false}),
  blood:Object.freeze({spriteId:"effects-0103",category:"effect_blood",duration:360,scale:1,rotation:0,decorative:true}),
  fire:Object.freeze({spriteId:"effects-0049",category:"effect_fire",duration:520,scale:1,rotation:0,decorative:true}),
  explosion:Object.freeze({spriteId:"effects-0072",category:"effect_fire",duration:460,scale:1,rotation:0,decorative:true}),
  water:Object.freeze({spriteId:"effects-0061",category:"effect_water",duration:620,scale:1,rotation:0,decorative:true}),
  magic:Object.freeze({spriteId:"effects-0076",category:"effect_magic",duration:440,scale:1,rotation:0,decorative:false}),
  heal:Object.freeze({spriteId:"effects-0141",category:"effect_heal",duration:520,scale:1,rotation:0,decorative:false}),
  status:Object.freeze({spriteId:"effects-0071",category:"effect_status",duration:480,scale:1,rotation:0,decorative:true}),
  emoteSleep:Object.freeze({spriteId:"effects-0095",category:"effect_emote",duration:0,scale:1,rotation:0,decorative:true}),
  emoteAlert:Object.freeze({spriteId:"effects-0096",category:"effect_emote",duration:0,scale:1,rotation:0,decorative:true}),
  emoteLost:Object.freeze({spriteId:"effects-0118",category:"effect_emote",duration:0,scale:1,rotation:0,decorative:true}),
});

export function effectDefinition(name){return EFFECT_SPRITES[name]??null;}
