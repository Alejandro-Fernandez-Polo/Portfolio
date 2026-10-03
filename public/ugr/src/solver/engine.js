import { getSubject } from "./catalog.js";
import { createGrid, maskForSession, collides, apply, undo } from "./grid.js";
import { CostAccumulator, DEFAULT_WEIGHTS } from "./cost.js";
import { validateFilters, splitHardSoft, pruneDomains, hardLimits } from "./filters.js";

const DOMAIN_FAILSAFE = 2e7;
const PROGRESS_EVERY = 2048;
const BEAM_WIDTH = 500;

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function hasInternalConflict(masks) {
  const grid = createGrid();
  for (const m of masks) {
    if (collides(grid, m)) return true;
    apply(grid, m);
  }
  return false;
}

class BoundedHeap {
  constructor(k) {
    this.k = Math.max(0, k);
    this.nodes = [];
    this.seq = 0;
  }

  size() {
    return this.nodes.length;
  }

  isFull() {
    return this.nodes.length >= this.k;
  }

  worstCost() {
    return this.nodes.length ? this.nodes[0].cost : Infinity;
  }

  static worse(a, b) {
    return a.cost > b.cost || (a.cost === b.cost && a.seq > b.seq);
  }

  offer(item) {
    if (this.k <= 0) return;
    const node = { item, cost: item.cost, seq: this.seq++ };
    if (this.nodes.length < this.k) {
      this.nodes.push(node);
      this.bubbleUp(this.nodes.length - 1);
      return;
    }
    if (BoundedHeap.worse(node, this.nodes[0])) return;
    this.nodes[0] = node;
    this.sinkDown(0);
  }

  bubbleUp(i) {
    const nodes = this.nodes;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (BoundedHeap.worse(nodes[i], nodes[parent])) {
        [nodes[i], nodes[parent]] = [nodes[parent], nodes[i]];
        i = parent;
      } else break;
    }
  }

  sinkDown(i) {
    const nodes = this.nodes;
    const n = nodes.length;
    for (;;) {
      const l = 2 * i + 1;
      const r = 2 * i + 2;
      let worst = i;
      if (l < n && BoundedHeap.worse(nodes[l], nodes[worst])) worst = l;
      if (r < n && BoundedHeap.worse(nodes[r], nodes[worst])) worst = r;
      if (worst === i) break;
      [nodes[i], nodes[worst]] = [nodes[worst], nodes[i]];
      i = worst;
    }
  }

  toArray() {
    return this.nodes
      .map((n) => n.item)
      .sort((a, b) => a.cost - b.cost);
  }
}

export function buildDomains(problem, catalog) {
  const domains = [];
  const missing = [];
  const scores = problem.docentScores || {};
  for (const code of problem.subjects || []) {
    const subject = getSubject(catalog, code);
    if (!subject) {
      missing.push(code);
      continue;
    }
    const values = [];
    for (const group of subject.grupos) {
      const subs = group.practicas?.subgrupos || [];
      const practiceKeys = subs.length ? subs : [null];
      for (const p of practiceKeys) {
        const entries = [];
        for (const s of group.teoria) entries.push({ dia: s.dia, inicio: s.inicio, fin: s.fin, codigo: code, tipo: "T" });
        if (p) {
          for (const s of group.practicas[p] || []) {
            entries.push({ dia: s.dia, inicio: s.inicio, fin: s.fin, codigo: code, tipo: "P" });
          }
        }
        const masks = entries.map(maskForSession).filter(Boolean);
        if (hasInternalConflict(masks)) continue;
        const score = scores[`${code}-${group.letra}`];
        values.push({
          teoria: group.letra,
          practica: p,
          entries,
          masks,
          profScore: typeof score === "number" ? score : null,
        });
      }
    }
    domains.push({ code, subject, values });
  }
  return { domains, missing };
}

function itemFromChoices(choices, acc, cost, breakdown) {
  const groupChoices = {};
  const selectedSubjects = {};
  for (const c of choices) {
    groupChoices[c.code] = { teoria: c.value.teoria, practica: c.value.practica };
    selectedSubjects[c.code] = true;
  }
  return {
    groupChoices,
    selectedSubjects,
    cost: cost ?? acc.value(),
    costBreakdown: breakdown ?? acc.breakdown(),
  };
}

function beamSearch(domains, softFilters, weights, heap, stats, width = BEAM_WIDTH) {
  const profWeight = weights.professor || 0;
  const beamCost = (beam) => beam.acc.value() + profWeight * beam.profPenalty;
  let beams = [{ grid: createGrid(), acc: new CostAccumulator(softFilters, weights), choices: [], profPenalty: 0 }];
  for (const dom of domains) {
    const next = [];
    for (const beam of beams) {
      for (const value of dom.values) {
        let ok = true;
        for (const m of value.masks) {
          if (collides(beam.grid, m)) {
            ok = false;
            break;
          }
        }
        if (!ok) continue;
        const grid = createGrid();
        grid.words.set(beam.grid.words);
        for (const m of value.masks) apply(grid, m);
        const acc = beam.acc.clone();
        for (const e of value.entries) acc.add(e);
        const penalty = value.profScore != null ? 6 - value.profScore : 0;
        next.push({
          grid,
          acc,
          choices: [...beam.choices, { code: dom.code, value }],
          profPenalty: beam.profPenalty + penalty,
        });
      }
    }
    stats.nodes += next.length;
    next.sort((a, b) => beamCost(a) - beamCost(b));
    beams = next.slice(0, width);
    if (!beams.length) break;
  }
  for (const beam of beams) {
    stats.found++;
    const breakdown = beam.acc.breakdown();
    breakdown.professorPenalty = beam.profPenalty;
    heap.offer(itemFromChoices(beam.choices, beam.acc, beamCost(beam), breakdown));
  }
  stats.kept = heap.size();
}

export function solve(problem, catalog, opts = {}) {
  const {
    k = 200,
    weights = DEFAULT_WEIGHTS,
    seed = 1,
    timeBudgetMs = 0,
    onNode,
    shouldStop,
    apellido = "",
  } = opts;

  const t0 = performance.now();
  const filters = problem.filters || [];
  const validation = validateFilters(filters);
  if (!validation.ok) {
    throw new RangeError(`filtros inválidos: ${validation.errors.join("; ")}`);
  }

  const { hard, soft } = splitHardSoft(filters);
  const { domains, missing } = buildDomains(problem, catalog);
  pruneDomains(domains, hard, { apellido });
  const limits = hardLimits(hard);

  const stats = {
    nodes: 0,
    found: 0,
    kept: 0,
    elapsedMs: 0,
    approximate: false,
    truncated: false,
    missing,
  };

  let product = 1;
  for (const d of domains) {
    if (d.values.length === 0) product = 0;
    product *= d.values.length;
    if (product > DOMAIN_FAILSAFE) break;
  }

  domains.sort((a, b) => a.values.length - b.values.length);

  const rng = mulberry32(seed);
  for (const d of domains) shuffle(d.values, rng);

  const heap = new BoundedHeap(k);
  const profWeight = weights.professor || 0;
  let profPenalty = 0;

  if (product > DOMAIN_FAILSAFE) {
    stats.approximate = true;
    beamSearch(domains, soft, weights, heap, stats);
    stats.elapsedMs = performance.now() - t0;
    return { items: heap.toArray(), stats };
  }

  const grid = createGrid();
  const acc = new CostAccumulator(soft, weights);
  const chosen = new Array(domains.length);
  let stop = false;
  const budgetMs = timeBudgetMs > 0 ? timeBudgetMs : 0;

  function tick() {
    stats.nodes++;
    if (shouldStop && shouldStop()) {
      stop = true;
      return;
    }
    if (budgetMs && (stats.nodes & 255) === 0 && performance.now() - t0 > budgetMs) {
      stop = true;
      return;
    }
    if ((stats.nodes & (PROGRESS_EVERY - 1)) === 0 && onNode) {
      onNode({
        nodes: stats.nodes,
        found: stats.found,
        kept: heap.size(),
        elapsedMs: performance.now() - t0,
      });
    }
  }

  function record() {
    stats.found++;
    const breakdown = acc.breakdown();
    breakdown.professorPenalty = profPenalty;
    heap.offer(itemFromChoices(chosen, acc, acc.value() + profWeight * profPenalty, breakdown));
    stats.kept = heap.size();
  }

  function search(depth) {
    if (stop) return;
    tick();
    if (stop) return;
    if (depth === domains.length) {
      record();
      return;
    }
    const dom = domains[depth];
    if (dom.values.length === 0) return;
    const threshold = heap.isFull() ? heap.worstCost() : Infinity;
    for (const value of dom.values) {
      let ok = true;
      for (const m of value.masks) {
        if (collides(grid, m)) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      for (const m of value.masks) apply(grid, m);
      for (const e of value.entries) acc.add(e);
      const penalty = value.profScore != null ? 6 - value.profScore : 0;
      profPenalty += penalty;

      if (
        acc.byDay.size > limits.maxDays ||
        acc.morningDays > limits.maxMorningDays ||
        acc.afternoonDays > limits.maxAfternoonDays
      ) {
        profPenalty -= penalty;
        for (const e of value.entries) acc.remove(e);
        for (const m of value.masks) undo(grid, m);
        continue;
      }

      if (threshold !== Infinity && acc.lowerBound(weights) + profWeight * profPenalty >= threshold) {
        profPenalty -= penalty;
        for (const e of value.entries) acc.remove(e);
        for (const m of value.masks) undo(grid, m);
        continue;
      }

      chosen[depth] = { code: dom.code, value };
      search(depth + 1);
      chosen[depth] = undefined;

      profPenalty -= penalty;
      for (const e of value.entries) acc.remove(e);
      for (const m of value.masks) undo(grid, m);
      if (stop) return;
    }
  }

  search(0);
  stats.truncated = stop;
  stats.elapsedMs = performance.now() - t0;
  return { items: heap.toArray(), stats };
}
