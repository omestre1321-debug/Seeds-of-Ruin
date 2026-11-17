import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { applyOverrides, buildSpriteAtlas, decodePng, validateAtlas } from "../tools/build-sprite-atlas.mjs";
import { PLAYER_BODY_VARIANTS } from "../js/data/sprite-character-visuals.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const atlasPath = path.join(root, "assets/atlas.json");
const requiredItemCategories = ["weapon_sword","weapon_axe","weapon_mace","weapon_staff","weapon_bow","shield","helmet","chest_armor","boots","gloves","ring","amulet","potion","food","gem","key","book","herb"];

async function readAtlas() { return JSON.parse(await fs.readFile(atlasPath, "utf8")); }

test("atlas includes valid, non-overlapping, categorized sprite boxes in all sheets", async () => {
  const atlas = await readAtlas();
  assert.equal(validateAtlas(atlas.sprites, atlas.sheets), true);
  assert.deepEqual(Object.keys(atlas.sheets), ["items","items-small","effects","characters"]);
  const ids = new Set(atlas.sprites.map((sprite) => sprite.id));
  for(const body of PLAYER_BODY_VARIANTS)assert.ok(ids.has(body.spriteId),`body variant ${body.id} must be a valid atlas sprite`);
  for (const category of requiredItemCategories) assert.ok(atlas.categories[category]?.length, `missing ${category}`);
  assert.ok(Object.hasOwn(atlas.categories,"gloves"),"gloves category remains available for a reviewed manual crop");
  assert.ok(Object.keys(atlas.categories).some((category) => category.startsWith("monster_")));
  assert.ok(Object.keys(atlas.categories).filter((category) => category.startsWith("effect_")).length >= 5);
  for (const [category, values] of Object.entries(atlas.categories)) {
    for (const [index, id] of values.entries()) {
      assert.ok(ids.has(id), `${category} refers to missing ${id}`);
      assert.equal(atlas.sprites.find((sprite) => sprite.id === id).levelIndex, index);
    }
  }
});

test("source scaling and matte measurements match the inspected screenshots", async () => {
  const atlas = await readAtlas();
  assert.deepEqual([atlas.sheets.items.width, atlas.sheets.items.height, atlas.sheets.items.sourceScale], [212, 227, 3]);
  assert.deepEqual([atlas.sheets["items-small"].width, atlas.sheets["items-small"].height, atlas.sheets["items-small"].sourceScale], [225, 223, 1]);
  assert.deepEqual([atlas.sheets.effects.width, atlas.sheets.effects.height, atlas.sheets.effects.sourceScale], [650, 384, 1]);
  assert.deepEqual([atlas.sheets.characters.width, atlas.sheets.characters.height, atlas.sheets.characters.sourceScale], [130, 147, 3]);
  for (const sheet of Object.values(atlas.sheets)) {
    const image = decodePng(await fs.readFile(path.join(root, sheet.file)));
    let transparent = 0; let opaque = 0;
    for (let index = 3; index < image.pixels.length; index += 4) { if (image.pixels[index] === 0) transparent += 1; if (image.pixels[index] === 255) opaque += 1; }
    assert.ok(transparent > 0, `${sheet.file} still has no transparent matte`);
    assert.ok(opaque > 0, `${sheet.file} lost all sprite pixels`);
  }
});

test("atlas overrides take priority for labels/categories/boxes and can add or remove sprites", () => {
  const original = [{ id:"items-r00-c00", sheet:"items", x:0, y:0, width:16, height:16, category:"ring" }];
  const adjusted = applyOverrides(original, {
    sprites:{ "items-r00-c00":{ name:"manual-ring", category:"amulet", x:1 } },
    removeIds:[],
    add:[{ id:"manual-extra", sheet:"items", x:20, y:0, width:8, height:8, category:"gem" }],
  });
  assert.equal(adjusted[0].name,"manual-ring");
  assert.equal(adjusted[0].category,"amulet");
  assert.equal(adjusted[0].x,1);
  assert.equal(adjusted[1].detection,"manual");
  assert.equal(applyOverrides(original,{removeIds:["items-r00-c00"]}).length,0);
});

test("the atlas generator is repeatable for normalized sheets, IDs and categories", async () => {
  const before = await readAtlas();
  const rebuilt = await buildSpriteAtlas({ root });
  assert.deepEqual(rebuilt.sprites, before.sprites);
  assert.deepEqual(rebuilt.categories, before.categories);
  assert.deepEqual(rebuilt.warnings, before.warnings);
});

test("validator rejects out-of-bounds boxes and overlaps rather than guessing", () => {
  const sheets = { items:{ width:32, height:16 } };
  assert.throws(() => validateAtlas([{id:"bad",sheet:"items",x:20,y:0,width:16,height:16,category:"gem"}],sheets),/outside/);
  assert.throws(() => validateAtlas([
    {id:"a",sheet:"items",x:0,y:0,width:16,height:16,category:"gem"},
    {id:"b",sheet:"items",x:15,y:0,width:16,height:16,category:"key"},
  ],sheets),/Overlapping/);
});

test("sprite browser and override template are present", async () => {
  const html = await fs.readFile(path.join(root,"tools/sprite-browser.html"),"utf8");
  const overrides = JSON.parse(await fs.readFile(path.join(root,"assets/atlas-overrides.json"),"utf8"));
  assert.match(html,/imageSmoothingEnabled\s*=\s*false/);
  assert.match(html,/Download overrides/);
  assert.ok(overrides.sprites);
});
