import { describe, it, expect } from 'vitest';
import { detectChapters, assertCoverage, romanToInt } from '../src/structure/detectChapters.js';

const filler = (n) => 'Lorem ipsum dolor sit amet. '.repeat(n).trim();

const fakeBook = () =>
  [
    'THE TITLE', 'CONTENTS', 'CHAPTER I.', 'CHAPTER II.', 'CHAPTER III.',
    'PREFACE', filler(40),
    'CHAPTER I.', filler(60), filler(20),
    'CHAPTER II.', filler(80),
    'CHAPTER III.', filler(50),
  ].join('\n\n');

describe('detectChapters', () => {
  it('finds real chapters and ignores the table of contents', () => {
    const r = detectChapters(fakeBook());
    expect(r.chapters.map((c) => c.number)).toEqual([1, 2, 3]);
    expect(r.frontMatter).not.toBeNull();
  });

  it('tiles the text exactly (no gaps, no overlaps)', () => {
    const text = fakeBook();
    expect(() => assertCoverage(text, detectChapters(text))).not.toThrow();
  });

  it('warns when chapter numbering jumps', () => {
    const text = ['CHAPTER I.', filler(60), 'CHAPTER III.', filler(60)].join('\n\n');
    const r = detectChapters(text);
    expect(r.warnings.some((w) => w.includes('jumps'))).toBe(true);
  });

  it('warns when there are no headings', () => {
    const r = detectChapters(filler(50));
    expect(r.chapters).toHaveLength(0);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe('romanToInt', () => {
  it('parses numerals', () => {
    expect(romanToInt('XIV')).toBe(14);
    expect(romanToInt('XIX')).toBe(19);
    expect(romanToInt('XX')).toBe(20);
  });
});