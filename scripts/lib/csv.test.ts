// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseCsv, readTable } from './csv.ts';

describe('parseCsv', () => {
  it('parses quotes, escaped quotes, commas and newlines inside quotes', () => {
    const text = 'a,b,c\r\n1,"x, y","say ""hi"""\n2,"two\nlines",\n';
    expect(parseCsv(text)).toEqual([
      { line: 1, fields: ['a', 'b', 'c'] },
      { line: 2, fields: ['1', 'x, y', 'say "hi"'] },
      { line: 3, fields: ['2', 'two\nlines', ''] },
    ]);
  });

  it('ignores a BOM, blank lines and a missing final newline', () => {
    expect(parseCsv('﻿a,b\n\n1,2')).toEqual([
      { line: 1, fields: ['a', 'b'] },
      { line: 3, fields: ['1', '2'] },
    ]);
  });

  it('rejects an unclosed quote', () => {
    expect(() => parseCsv('a\n"oops')).toThrow('Unclosed quote starting on line 2');
  });
});

describe('readTable', () => {
  it('keys rows by header and trims values', () => {
    const t = readTable('t.csv', 'id, name\nx , Alface\n', ['id', 'name']);
    expect(t.rows).toEqual([{ line: 2, values: { id: 'x', name: 'Alface' } }]);
  });

  it('reports missing columns, wrong column counts and empty files', () => {
    expect(() => readTable('t.csv', 'id\n1\n', ['id', 'name'])).toThrow('missing columns: name');
    expect(() => readTable('t.csv', 'id,name\n1\n', ['id'])).toThrow('t.csv:2: expected 2 columns');
    expect(() => readTable('t.csv', '', ['id'])).toThrow('empty file');
  });
});
