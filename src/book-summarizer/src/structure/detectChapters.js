const ROMAN = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

export function romanToInt(s) {
  const up = s.toUpperCase();
  if (!up) return null;
  let total = 0;
  for (let i = 0; i < up.length; i++) {
    const v = ROMAN[up[i]];
    if (!v) return null;
    const next = ROMAN[up[i + 1]];
    total += next && next > v ? -v : v;
  }
  return total;
}

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const FA_ORDINALS = {
  اول: 1, نخست: 1, دوم: 2, سوم: 3, چهارم: 4, پنجم: 5, ششم: 6, هفتم: 7, هشتم: 8, نهم: 9,
  دهم: 10, یازدهم: 11, دوازدهم: 12, سیزدهم: 13, چهاردهم: 14, پانزدهم: 15,
  شانزدهم: 16, هفدهم: 17, هجدهم: 18, نوزدهم: 19, بیستم: 20,
};

function toAsciiDigits(s) {
  return s.replace(/[۰-۹٠-٩]/g, (d) => {
    const i = PERSIAN_DIGITS.indexOf(d);
    return String(i !== -1 ? i : ARABIC_DIGITS.indexOf(d));
  });
}

function cleanToken(token) {
  return toAsciiDigits(token).replace(/[.:،؛\-–—]+$/, '');
}

function parseNumber(token) {
  const t = cleanToken(token);
  if (/^\d+$/.test(t)) return Number(t);
  if (Object.hasOwn(FA_ORDINALS, t)) return FA_ORDINALS[t];
  return romanToInt(t);
}

// "فصل" also means "season", so require a number-like word after it.
// Persian ordinals not in our small list (e.g. "بیست‌ویکم") still end with "م".
function isNumberToken(token) {
  return parseNumber(token) !== null || /م$/.test(cleanToken(token));
}

// Each pattern must match a WHOLE heading line. Group 1 = number word, group 2 = optional title.
// No "g" flag (it makes regexes stateful).
export const DEFAULT_PATTERNS = [
  /^(?:CHAPTER|Chapter)\s+([IVXLCDM]+|\d+)\b[\s.:\-–—]*(.*)$/,
  /^(?:فصل|باب)[\s\u200c]+(\S+)[\s.:\-–—]*(.*)$/,
];

/** Returns { label, numberToken, title } if the text looks like a chapter heading, else null. */
export function matchHeading(paragraph, patterns = DEFAULT_PATTERNS, maxHeadingChars = 100) {
  const t = paragraph.trim();
  if (!t || t.length > maxHeadingChars) return null;
  for (const re of patterns) {
    const m = re.exec(t);
    if (m && isNumberToken(m[1])) return { label: t, numberToken: m[1], title: (m[2] ?? '').trim() };
  }
  return null;
}

/**
 * Headings are LINE-based. Put a blank line around every heading-like line, so the paragraph
 * cleaner can never glue a heading to the text that follows it.
 */
export function isolateHeadings(text, patterns = DEFAULT_PATTERNS, maxHeadingChars = 100) {
  const out = [];
  for (const line of text.split('\n')) {
    if (matchHeading(line, patterns, maxHeadingChars)) out.push('', line.trim(), '');
    else out.push(line);
  }
  return out.join('\n');
}

function findCandidates(text, patterns, maxHeadingChars) {
  const out = [];
  let pos = 0;
  for (const para of text.split('\n\n')) {
    const start = pos;
    pos += para.length + 2; // +2 for the "\n\n" separator
    const h = matchHeading(para, patterns, maxHeadingChars);
    if (h) out.push({ ...h, start });
  }
  return out;
}

// A table of contents = several heading-like lines packed closely together.
function dropTocRuns(cands, minGapChars, minRunLength) {
  const runs = [];
  let run = [];
  for (const c of cands) {
    const prev = run[run.length - 1];
    if (prev && c.start - prev.start < minGapChars) run.push(c);
    else {
      if (run.length) runs.push(run);
      run = [c];
    }
  }
  if (run.length) runs.push(run);

  const kept = [];
  const dropped = [];
  for (const r of runs) (r.length >= minRunLength ? dropped : kept).push(...r);
  return { kept, dropped };
}

export function detectChapters(text, opts = {}) {
  const { patterns = DEFAULT_PATTERNS, maxHeadingChars = 100, minGapChars = 300 } = opts;
  const warnings = [];

  const all = findCandidates(text, patterns, maxHeadingChars);
  const { kept, dropped } = dropTocRuns(all, minGapChars, 3);
  if (dropped.length) {
    warnings.push(`Ignored ${dropped.length} heading-like lines that look like a table of contents.`);
  }
  if (kept.length === 0) {
    warnings.push('No chapter headings found. A fallback strategy is needed.');
    return { frontMatter: null, chapters: [], warnings };
  }

  const chapters = kept.map((c, i) => {
    const end = i + 1 < kept.length ? kept[i + 1].start : text.length;
    return {
      index: i + 1,
      label: c.label,
      title: c.title,
      number: parseNumber(c.numberToken),
      start: c.start,
      end,
      chars: end - c.start,
    };
  });
  const frontMatter = kept[0].start > 0 ? { start: 0, end: kept[0].start } : null;

  for (let i = 1; i < chapters.length; i++) {
    const a = chapters[i - 1].number;
    const b = chapters[i].number;
    if (a != null && b != null && b !== a + 1) {
      warnings.push(`Numbering jumps from ${a} to ${b} at "${chapters[i].label}".`);
    }
  }
  for (const ch of chapters) {
    if (ch.chars < 1000) warnings.push(`"${ch.label}" is very short (${ch.chars} chars).`);
  }
  return { frontMatter, chapters, warnings };
}

/** Throws if the pieces don't tile the text exactly (no gaps, no overlaps). */
export function assertCoverage(text, { frontMatter, chapters }) {
  if (chapters.length === 0) throw new Error('No chapters to check.');
  let cursor = 0;
  if (frontMatter) cursor = frontMatter.end;
  for (const ch of chapters) {
    if (ch.start !== cursor) {
      throw new Error(`Gap/overlap before "${ch.label}": expected ${cursor}, got ${ch.start}`);
    }
    cursor = ch.end;
  }
  if (cursor !== text.length) throw new Error(`Chapters end at ${cursor}, text is ${text.length}.`);
}