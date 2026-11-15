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

test("the page references only local source files and contains no network assets",()=>{
  const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");
  const css=readFileSync(new URL("../css/styles.css",import.meta.url),"utf8");
  assert.match(html,/\.\/css\/styles\.css/);
  assert.match(html,/\.\/js\/main\.js/);
  assert.doesNotMatch(`${html}\n${css}`,/https?:\/\//i);
});
