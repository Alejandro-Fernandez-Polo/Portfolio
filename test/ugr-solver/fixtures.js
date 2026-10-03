import { EC_SUBJECTS, EC_CODES, EC_EXPECTED_COUNT } from "../../public/ugr/src/solver/fixtures.js";

export { EC_SUBJECTS, EC_CODES, EC_EXPECTED_COUNT };

function toMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function overlap(a, b) {
  return toMinutes(a.inicio) < toMinutes(b.fin) && toMinutes(b.inicio) < toMinutes(a.fin);
}

// Oráculo independiente: fuerza bruta 3^6, conflicto solo entre asignaturas distintas.
export function ecBruteForce() {
  const results = [];
  const subjects = EC_SUBJECTS;

  function entriesFor(assignment) {
    const entries = [];
    for (const subject of subjects) {
      const group = subject.grupos[0];
      const sg = assignment[subject.codigo];
      group.teoria.forEach((s) => entries.push({ codigo: subject.codigo, ...s }));
      group.practicas[sg].forEach((s) => entries.push({ codigo: subject.codigo, ...s }));
    }
    return entries;
  }

  function hasConflict(entries) {
    for (let i = 0; i < entries.length; i++) {
      for (let j = i + 1; j < entries.length; j++) {
        const a = entries[i];
        const b = entries[j];
        if (a.codigo === b.codigo) continue;
        if (a.dia !== b.dia) continue;
        if (overlap(a, b)) return true;
      }
    }
    return false;
  }

  function recurse(i, assignment) {
    if (i === subjects.length) {
      const entries = entriesFor(assignment);
      if (!hasConflict(entries)) results.push({ ...assignment });
      return;
    }
    const subject = subjects[i];
    const group = subject.grupos[0];
    for (const sg of group.practicas.subgrupos) {
      assignment[subject.codigo] = sg;
      recurse(i + 1, assignment);
    }
  }

  recurse(0, {});
  return results;
}
