const DELIMITERS = [",", ";", "\t", "|"];

function stripBOM(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function detectEncoding(text) {
  if (typeof text !== "string") return "utf-8";
  if (text.includes("\uFFFD")) return "latin-1";
  if (/[\u0080-\u009f]/.test(text)) return "latin-1";
  return "utf-8";
}

function isArrayBufferLike(input) {
  return input instanceof ArrayBuffer || ArrayBuffer.isView(input);
}

function decodeInput(input) {
  if (typeof input === "string") {
    const text = stripBOM(input);
    return { text, encoding: detectEncoding(text), supported: true };
  }
  if (!isArrayBufferLike(input)) {
    return { text: "", encoding: "utf-8", supported: false };
  }
  let bytes = input instanceof ArrayBuffer ? new Uint8Array(input) : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    bytes = bytes.subarray(3);
  }
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), encoding: "utf-8", supported: true };
  } catch {
    return { text: new TextDecoder("windows-1252").decode(bytes), encoding: "latin-1", supported: true };
  }
}

function detectDelimiter(text) {
  const sample = text.slice(0, 131072);
  const counts = new Map(DELIMITERS.map((d) => [d, []]));
  const active = new Map(DELIMITERS.map((d) => [d, 0]));
  let inQuotes = false;
  let lineHasContent = false;

  const closeLine = () => {
    if (lineHasContent) {
      for (const d of DELIMITERS) counts.get(d).push(active.get(d));
    }
    for (const d of DELIMITERS) active.set(d, 0);
    lineHasContent = false;
  };

  for (let i = 0; i < sample.length; i++) {
    const c = sample[i];
    if (c === '"') {
      if (inQuotes && sample[i + 1] === '"') {
        i++;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && (c === "\n" || c === "\r")) {
      if (c === "\r" && sample[i + 1] === "\n") i++;
      closeLine();
      continue;
    }
    if (!inQuotes && active.has(c)) active.set(c, active.get(c) + 1);
    if (!/\s/.test(c)) lineHasContent = true;
  }
  closeLine();

  let best = ",";
  let bestScore = -1;
  for (const d of DELIMITERS) {
    const perLine = counts.get(d);
    if (!perLine.length) continue;
    const freq = new Map();
    for (const n of perLine) freq.set(n, (freq.get(n) || 0) + 1);
    let modal = 0;
    let modalLines = 0;
    for (const [n, lines] of freq) {
      if (n < 1) continue;
      if (lines > modalLines || (lines === modalLines && n > modal)) {
        modal = n;
        modalLines = lines;
      }
    }
    if (modal < 1) continue;
    const score = modalLines * 1000 + modal;
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

function parseRows(text, delimiter) {
  const rows = [];
  const problems = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  let hasField = false;

  const flushField = () => {
    row.push(field);
    field = "";
    hasField = false;
  };
  const flushRow = () => {
    flushField();
    if (row.length === 1 && row[0].trim() === "") {
      row = [];
      return;
    }
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"' && !hasField) {
      inQuotes = true;
      hasField = true;
      continue;
    }
    if (c === delimiter) {
      flushField();
      continue;
    }
    if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      flushRow();
      continue;
    }
    field += c;
    hasField = true;
  }

  if (hasField || row.length > 0) flushRow();
  if (inQuotes) {
    problems.push({ row: rows.length ? rows.length - 1 : 0, message: "comillas sin cerrar" });
  }
  return { rows, problems };
}

function isNumericCell(value) {
  return /^[+-]?(\d+([.,]\d+)?)$/.test(value);
}

function detectHeader(rows) {
  const first = rows[0];
  if (!first || first.length === 0) return false;
  const cells = first.map((c) => c.trim());
  if (cells.some((c) => c === "")) return false;
  if (cells.some((c) => isNumericCell(c))) return false;
  if (!cells.some((c) => /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(c))) return false;
  return true;
}

function findRaggedRows(rows, hasHeader) {
  const problems = [];
  if (rows.length < 2) return problems;
  const expected = hasHeader
    ? rows[0].length
    : (() => {
        const freq = new Map();
        for (const row of rows) freq.set(row.length, (freq.get(row.length) || 0) + 1);
        let modal = 1;
        let modalLines = 0;
        for (const [len, lines] of freq) {
          if (lines > modalLines) {
            modal = len;
            modalLines = lines;
          }
        }
        return modal;
      })();
  const start = hasHeader ? 1 : 0;
  for (let i = start; i < rows.length; i++) {
    if (rows[i].length !== expected) {
      problems.push({ row: i, message: `${rows[i].length} columnas, se esperaban ${expected}` });
    }
  }
  return problems;
}

export function parseCSV(input) {
  const { text, encoding, supported } = decodeInput(input);
  const problems = [];
  if (!supported) {
    problems.push({ row: null, message: "entrada no soportada: se esperaba texto o bytes" });
    return { rows: [], delimiter: ",", hasHeader: false, headers: undefined, encoding, problems };
  }
  const delimiter = detectDelimiter(text);
  const { rows, problems: rowProblems } = parseRows(text, delimiter);
  problems.push(...rowProblems);
  const hasHeader = detectHeader(rows);
  problems.push(...findRaggedRows(rows, hasHeader));
  return {
    rows,
    delimiter,
    hasHeader,
    headers: hasHeader ? rows[0] : undefined,
    encoding,
    problems,
  };
}
