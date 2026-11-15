/** A row of a CSV table, keyed by header, with its 1-based line number for error messages. */
export interface CsvRow {
  line: number;
  values: Record<string, string>;
}

export interface CsvTable {
  file: string;
  headers: string[];
  rows: CsvRow[];
}

/**
 * Parses RFC 4180 CSV: comma-separated, `"` quotes with `""` escapes, CRLF or LF line ends.
 * Returns each record with the line it starts on.
 */
export function parseCsv(text: string): { line: number; fields: string[] }[] {
  const records: { line: number; fields: string[] }[] = [];
  let fields: string[] = [];
  let field = '';
  let quoted = false;
  let line = 1;
  let recordLine = 1;
  const src = text.startsWith('﻿') ? text.slice(1) : text; // drop a byte-order mark

  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        if (c === '\n') line++;
        field += c;
      }
    } else if (c === '"' && field === '') {
      quoted = true;
    } else if (c === ',') {
      fields.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      fields.push(field);
      records.push({ line: recordLine, fields });
      fields = [];
      field = '';
      line++;
      recordLine = line;
    } else {
      field += c;
    }
  }
  if (quoted) throw new Error(`Unclosed quote starting on line ${recordLine}`);
  if (field !== '' || fields.length > 0) {
    fields.push(field);
    records.push({ line: recordLine, fields });
  }
  return records.filter((r) => !(r.fields.length === 1 && r.fields[0] === ''));
}

/** Parses a CSV file's text into rows keyed by its header; checks every row has all columns. */
export function readTable(
  file: string,
  text: string,
  expectedHeaders: readonly string[],
): CsvTable {
  const [header, ...records] = parseCsv(text);
  if (!header) throw new Error(`${file}: empty file`);
  const headers = header.fields.map((h) => h.trim());
  const missing = expectedHeaders.filter((h) => !headers.includes(h));
  if (missing.length) throw new Error(`${file}: missing columns: ${missing.join(', ')}`);

  const rows = records.map(({ line, fields }) => {
    if (fields.length !== headers.length) {
      throw new Error(
        `${file}:${line}: expected ${headers.length} columns, found ${fields.length}`,
      );
    }
    const values: Record<string, string> = {};
    headers.forEach((h, i) => (values[h] = (fields[i] ?? '').trim()));
    return { line, values };
  });
  return { file, headers, rows };
}
