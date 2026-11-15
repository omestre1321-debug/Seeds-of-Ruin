import test from "node:test";
import assert from "node:assert/strict";
import { dailySeed, hashSeed, Rng } from "../js/core/rng.js";

test("seeded RNG repeats its stream and fork is independent", () => {
  const first = new Rng("cinder-42");
  const second = new Rng("cinder-42");
  assert.deepEqual(Array.from({ length: 100 }, () => first.nextUint32()), Array.from({ length: 100 }, () => second.nextUint32()));

  const parentA = new Rng("root");
  const parentB = new Rng("root");
  assert.equal(parentA.fork("rooms").nextUint32(), parentB.fork("rooms").nextUint32());
  parentA.nextUint32();
  assert.equal(parentA.fork("rooms").nextUint32(), parentB.fork("rooms").nextUint32());
});

test("bounded integers include both endpoints and reject invalid ranges", () => {
  const rng = new Rng(123);
  for (let index = 0; index < 1000; index += 1) {
    const value = rng.int(-3, 4);
    assert.ok(value >= -3 && value <= 4);
  }
  assert.throws(() => rng.int(2, 1), RangeError);
});

test("string hashing and daily seed are stable", () => {
  assert.equal(hashSeed("ASH-001"), hashSeed("ASH-001"));
  assert.notEqual(hashSeed("ASH-001"), hashSeed("ASH-002"));
  assert.equal(dailySeed("2026-11-15"), "ASHEN-2026-11-15");
  assert.equal(dailySeed(new Date("2026-11-15T23:00:00-08:00")), "ASHEN-2026-11-16");
});
