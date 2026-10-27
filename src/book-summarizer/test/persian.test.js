import { describe, it, expect } from 'vitest';
import { isolateHeadings, detectChapters, assertCoverage } from '../src/structure/detectChapters.js';
import { stripMarkdown, normalizeParagraphs } from '../src/extract/text.js';

const filler = (n) => 'این یک جمله آزمایشی است. '.repeat(n).trim();
const prep = (raw) => normalizeParagraphs(isolateHeadings(stripMarkdown(raw)));

const raw = [
  '## فصل اول', '', '### آغاز داستان', '', filler(40),
  '', 'فصل بهار بود و همه‌جا سبز شده بود.', '', filler(20),   // the word "season" must NOT become a chapter
  '', 'فصل دوم: دریاچه اشک', filler(60),                      // no blank line after the heading
  '', filler(10),
  '', 'فصل سوم', '', filler(50),
].join('\n');

describe('Persian headings', () => {
  it('finds all three heading styles and ignores "season" lines', () => {
    const r = detectChapters(prep(raw));
    expect(r.chapters.map((c) => c.number)).toEqual([1, 2, 3]);
    expect(r.chapters[1].title).toBe('دریاچه اشک');
  });

  it('still tiles the text exactly', () => {
    const text = prep(raw);
    expect(() => assertCoverage(text, detectChapters(text))).not.toThrow();
  });

  it('strips markdown noise', () => {
    expect(stripMarkdown('## فصل اول\nسلام\\\nدنیا')).toBe('فصل اول\nسلام\nدنیا');
  });
});