function splitTab(line) {
  return line.split("\t");
}

function splitMultiSpace(line) {
  return line.split(/\s{2,}/);
}

function splitSingleSpace(line) {
  return line.split(/\s+/);
}

function splitIdentity(line) {
  return [line];
}

function trimTrailingEmpty(cells) {
  const out = cells.slice();
  while (out.length > 1 && out[out.length - 1].trim() === "") out.pop();
  return out;
}

function pickSplit(lines) {
  const modes = [splitTab, splitMultiSpace, splitSingleSpace];
  const rowsByMode = modes.map((mode) => lines.map((line) => trimTrailingEmpty(mode(line))));
  let bestMode = -1;
  let bestScore = -1;
  for (let m = 0; m < modes.length; m++) {
    const widths = rowsByMode[m].map((row) => row.length);
    const headerWidth = widths[0];
    if (headerWidth < 2) continue;
    const dataWidths = widths.slice(1);
    const matches = dataWidths.filter((w) => w === headerWidth).length;
    const rate = dataWidths.length ? matches / dataWidths.length : 1;
    const score = rate * 1000 + headerWidth;
    if (score > bestScore) {
      bestScore = score;
      bestMode = m;
    }
  }
  if (bestMode === -1) return splitIdentity;
  return modes[bestMode];
}

export function parseTable(input) {
  if (typeof input !== "string") {
    return {
      rows: [],
      headers: undefined,
      problems: [{ row: null, message: "entrada no soportada: se esperaba texto" }],
    };
  }
  const lines = input
    .split(/\r\n|\r|\n/)
    .filter((line) => line.trim() !== "");
  if (lines.length === 0) {
    return { rows: [], headers: undefined, problems: [] };
  }
  const split = pickSplit(lines);
  const rows = lines.map((line) => trimTrailingEmpty(split(line)).map((cell) => cell.trim()));
  const problems = [];
  const expected = rows[0].length;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].length !== expected) {
      problems.push({ row: i, message: `${rows[i].length} columnas, se esperaban ${expected}` });
    }
  }
  return { rows, headers: rows[0], problems };
}
