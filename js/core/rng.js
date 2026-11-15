const UINT32_RANGE = 0x1_0000_0000;
const MULBERRY_INCREMENT = 0x6d2b79f5;

/** Stable FNV-1a hash. Numeric and string forms of a seed share the same representation. */
export function hashSeed(seed) {
  const text = String(seed ?? 0);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** A tiny, deterministic PRNG. Simulation code must use this seeded stream. */
export class Rng {
  constructor(seed) {
    this.seedText = String(seed ?? 0);
    this.seed = hashSeed(this.seedText);
    this.state = this.seed;
  }

  nextUint32() {
    this.state = (this.state + MULBERRY_INCREMENT) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return (value ^ (value >>> 14)) >>> 0;
  }

  /** A float in [0, 1). */
  next() {
    return this.nextUint32() / UINT32_RANGE;
  }

  /** An unbiased integer in the inclusive range [minimum, maximum]. */
  int(minimum, maximum) {
    if (!Number.isSafeInteger(minimum) || !Number.isSafeInteger(maximum) || maximum < minimum) {
      throw new RangeError("Rng.int expects safe integers and maximum >= minimum");
    }
    const span = maximum - minimum + 1;
    if (span > UINT32_RANGE) throw new RangeError("Rng.int range must fit in uint32");
    const limit = Math.floor(UINT32_RANGE / span) * span;
    let value;
    do {
      value = this.nextUint32();
    } while (value >= limit);
    return minimum + (value % span);
  }

  chance(probability) {
    if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
      throw new RangeError("Rng.chance expects a probability between 0 and 1");
    }
    return this.next() < probability;
  }

  pick(values) {
    if (!Array.isArray(values) || values.length === 0) throw new RangeError("Rng.pick needs a non-empty array");
    return values[this.int(0, values.length - 1)];
  }

  /** Derive an independent stream without consuming this stream. */
  fork(label) {
    return new Rng(`${this.seedText}::${String(label)}`);
  }
}

/** Stable YYYY-MM-DD daily challenge seed, intentionally based on UTC. */
export function dailySeed(date = new Date()) {
  const value = typeof date === "string" ? new Date(`${date}T00:00:00.000Z`) : date;
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) throw new TypeError("dailySeed expects a valid Date or YYYY-MM-DD string");
  const day = value.toISOString().slice(0, 10);
  return `ASHEN-${day}`;
}
