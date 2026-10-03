import { timeToMinutes, VALID_DAYS } from "./catalog.js";

export const GRID_START_MIN = 8 * 60;
export const GRID_END_MIN = 21 * 60;
export const GRID_TOTAL_MIN = GRID_END_MIN - GRID_START_MIN;
export const DAYS = VALID_DAYS.length;
export const WORDS_PER_DAY = Math.ceil(GRID_TOTAL_MIN / 32);

export const DAY_INDEX = VALID_DAYS.reduce((acc, dia, i) => {
  acc[dia] = i;
  return acc;
}, {});

export function createGrid() {
  return { words: new Uint32Array(DAYS * WORDS_PER_DAY) };
}

function dayBase(day) {
  return day * WORDS_PER_DAY;
}

function forEachWord(start, end, fn) {
  const firstWord = Math.floor(start / 32);
  const lastWord = Math.floor((end - 1) / 32);
  for (let w = firstWord; w <= lastWord; w++) {
    const wordStart = w * 32;
    const lo = Math.max(start, wordStart) - wordStart;
    const hi = Math.min(end, wordStart + 32) - wordStart;
    const lowMask = lo === 0 ? 0xffffffff : (0xffffffff << lo) >>> 0;
    const highMask = hi >= 32 ? 0xffffffff : ((1 << hi) - 1) >>> 0;
    const mask = (lowMask & highMask) >>> 0;
    if (mask) fn(w, mask);
  }
}

export function sessionSlot(session) {
  if (!session || !(session.dia in DAY_INDEX)) return null;
  const inicio = timeToMinutes(session.inicio);
  const fin = timeToMinutes(session.fin);
  if (Number.isNaN(inicio) || Number.isNaN(fin) || fin <= inicio) return null;
  const start = Math.max(0, inicio - GRID_START_MIN);
  const end = Math.min(GRID_TOTAL_MIN, fin - GRID_START_MIN);
  if (end <= start) return null;
  return { day: DAY_INDEX[session.dia], start, end };
}

export function maskForSession(session) {
  return sessionSlot(session);
}

export function collides(grid, mask) {
  if (!mask) return false;
  const base = dayBase(mask.day);
  let hit = false;
  forEachWord(mask.start, mask.end, (w, bits) => {
    if ((grid.words[base + w] & bits) !== 0) hit = true;
  });
  return hit;
}

export function apply(grid, mask) {
  if (!mask) return;
  const base = dayBase(mask.day);
  forEachWord(mask.start, mask.end, (w, bits) => {
    grid.words[base + w] = (grid.words[base + w] | bits) >>> 0;
  });
}

export function undo(grid, mask) {
  if (!mask) return;
  const base = dayBase(mask.day);
  forEachWord(mask.start, mask.end, (w, bits) => {
    grid.words[base + w] = (grid.words[base + w] ^ bits) >>> 0;
  });
}
