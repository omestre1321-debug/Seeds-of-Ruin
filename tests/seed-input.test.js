import test from "node:test";
import assert from "node:assert/strict";
import { randomWorldSeed } from "../js/utils/seed-input.js";

test("random world seed uses browser crypto when available and a deterministic fallback otherwise",()=>{
  const secure=randomWorldSeed({getRandomValues(array){array.set([0x12,0xabcd]);return array;}});
  assert.equal(secure,"ASH-000000120000ABCD");
  assert.equal(randomWorldSeed({getRandomValues(){throw new Error("blocked");}},1234,5),"ASH-000004D200001388");
  assert.notEqual(randomWorldSeed({getRandomValues(){throw new Error();}},1234,5),randomWorldSeed({getRandomValues(){throw new Error();}},1234,6));
});
