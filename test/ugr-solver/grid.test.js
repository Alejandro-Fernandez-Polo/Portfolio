import { describe, it, expect } from "vitest";
import {
  createGrid,
  maskForSession,
  collides,
  apply,
  undo,
  sessionSlot,
  GRID_TOTAL_MIN,
  WORDS_PER_DAY,
  DAYS,
  DAY_INDEX,
} from "../../public/ugr/src/solver/grid.js";

const s = (dia, inicio, fin) => ({ dia, inicio, fin });

describe("grid geometry", () => {
  it("has expected dimensions", () => {
    expect(DAYS).toBe(5);
    expect(WORDS_PER_DAY).toBe(Math.ceil(GRID_TOTAL_MIN / 32));
    expect(DAY_INDEX.lunes).toBe(0);
    expect(DAY_INDEX.viernes).toBe(4);
  });

  it("maps valid sessions to a slot", () => {
    expect(sessionSlot(s("lunes", "9:30", "10:30"))).toEqual({ day: 0, start: 90, end: 150 });
  });

  it("clips sessions that exceed grid bounds", () => {
    expect(sessionSlot(s("lunes", "7:00", "8:30"))).toEqual({ day: 0, start: 0, end: 30 });
    expect(sessionSlot(s("lunes", "20:30", "21:30"))).toEqual({ day: 0, start: 750, end: 780 });
  });

  it("returns null for outside/invalid sessions", () => {
    expect(sessionSlot(s("lunes", "22:00", "23:00"))).toBeNull();
    expect(sessionSlot(s("sabado", "9:00", "10:00"))).toBeNull();
    expect(maskForSession(s("lunes", "10:00", "9:00"))).toBeNull();
  });
});

describe("collides", () => {
  it("detects overlap", () => {
    const grid = createGrid();
    apply(grid, maskForSession(s("lunes", "9:30", "10:30")));
    expect(collides(grid, maskForSession(s("lunes", "10:00", "11:00")))).toBe(true);
    expect(collides(grid, maskForSession(s("lunes", "9:30", "10:30")))).toBe(true);
  });

  it("does not flag adjacent sessions", () => {
    const grid = createGrid();
    apply(grid, maskForSession(s("lunes", "9:30", "10:30")));
    expect(collides(grid, maskForSession(s("lunes", "10:30", "11:30")))).toBe(false);
    expect(collides(grid, maskForSession(s("lunes", "8:30", "9:30")))).toBe(false);
  });

  it("does not flag different days", () => {
    const grid = createGrid();
    apply(grid, maskForSession(s("lunes", "9:30", "10:30")));
    expect(collides(grid, maskForSession(s("martes", "9:30", "10:30")))).toBe(false);
  });
});

describe("apply/undo", () => {
  it("undo restores the grid (XOR)", () => {
    const grid = createGrid();
    const before = Array.from(grid.words);
    const mask = maskForSession(s("miercoles", "9:30", "11:30"));
    apply(grid, mask);
    expect(Array.from(grid.words)).not.toEqual(before);
    undo(grid, mask);
    expect(Array.from(grid.words)).toEqual(before);
  });

  it("supports multiple independent masks", () => {
    const grid = createGrid();
    const a = maskForSession(s("lunes", "9:30", "10:30"));
    const b = maskForSession(s("lunes", "11:30", "12:30"));
    apply(grid, a);
    apply(grid, b);
    expect(collides(grid, a)).toBe(true);
    expect(collides(grid, b)).toBe(true);
    undo(grid, a);
    expect(collides(grid, a)).toBe(false);
    expect(collides(grid, b)).toBe(true);
  });
});
