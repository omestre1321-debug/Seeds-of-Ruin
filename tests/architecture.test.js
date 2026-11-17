import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root=new URL("../js/core/",import.meta.url);
function filesUnder(directory) {
  const files=[];
  for(const name of readdirSync(directory)) {
    const path=join(directory,name);
    if(statSync(path).isDirectory())files.push(...filesUnder(path));
    else if(path.endsWith(".js"))files.push(path);
  }
  return files;
}

test("simulation core stays independent of DOM, Canvas, audio, and browser storage",()=>{
  for(const path of filesUnder(root.pathname)) {
    const source=readFileSync(path,"utf8");
    assert.doesNotMatch(source,/(?:\bdocument\b|\bwindow\b|CanvasRenderingContext2D|\bAudioContext\b|\blocalStorage\b)/,path);
    assert.doesNotMatch(source, /Math\.random\s*\(/, path);
  }
});

test("seed controls route through character creation into the run",()=>{
  const main=readFileSync(new URL("../js/main.js",import.meta.url),"utf8");
  assert.match(main,/openCharacterCreation\(ui\.menuSeed\.value\)/);
  assert.match(main,/openCharacterCreation\(dailySeed\(\)\)/);
  assert.match(main,/beginRun\(pendingSeed,readCharacterDraft\(\)\)/);
  assert.match(main,/ui\.menuSeed\.value=randomWorldSeed\(\)/);
});

test("the HTML has unique IDs and every static JS ID selector exists",()=>{
  const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
  const main=readFileSync(new URL("../js/main.js",import.meta.url),"utf8");
  const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map((match)=>match[1]);
  assert.equal(new Set(ids).size,ids.length,"duplicate HTML id");
  const available=new Set(ids);
  const selectors=[...main.matchAll(/(?:\$|document\.querySelector)\("#([^"`]+)"\)/g)].map((match)=>match[1]);
  for(const id of selectors)assert.ok(available.has(id),`main.js refers to missing #${id}`);
  for(const suffix of ["skin","hairStyle","hairColor","faceStyle","outfitColor"])assert.ok(available.has(`appearance-${suffix}`));
});

test("the page references only local source files and contains no network assets",()=>{
  const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
  const css=readFileSync(new URL("../css/styles.css",import.meta.url),"utf8");
  assert.match(html,/\.\/css\/styles\.css/);
  assert.match(html,/\.\/js\/main\.js/);
  assert.doesNotMatch(`${html}\n${css}`,/https?:\/\//i);
});
