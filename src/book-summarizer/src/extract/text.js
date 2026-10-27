const START_RE = /\*\*\*\s*START OF (?:THE|THIS) PROJECT GUTENBERG EBOOK[^\n]*\n/i;
const END_RE = /\*\*\*\s*END OF (?:THE|THIS) PROJECT GUTENBERG EBOOK/i;

const tidy = (s) => s.replace(/[ \t]{2,}/g, ' ').trim();

/**
 * Result: every paragraph on ONE line, paragraphs separated by exactly "\n\n".
 * Later code relies on this invariant (it is how character offsets are computed).
 */
export function normalizeParagraphs(text) {
  const blocks = text.split(/\n\s*\n/).filter((b) => b.trim());
  const lines = text.split('\n').filter((l) => l.trim()).length;
  const linesPerBlock = lines / Math.max(blocks.length, 1);

  // Gutenberg style: a paragraph is a few hard-wrapped lines; blank lines separate paragraphs.
  // Web style: one paragraph per line, with few or no blank lines. In that case the "blocks"
  // are enormous, so treat every newline as a paragraph break instead of gluing everything.
  if (linesPerBlock > 25) {
    return text.split('\n').map(tidy).filter(Boolean).join('\n\n');
  }
  return blocks.map((b) => tidy(b.replace(/\s*\n\s*/g, ' '))).join('\n\n');
}

export function cleanGutenberg(raw) {
  const warnings = [];
  let text = raw.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');

  const start = START_RE.exec(text);
  if (start) text = text.slice(start.index + start[0].length);
  else if (/gutenberg/i.test(raw)) warnings.push('Gutenberg START marker not found; header not stripped.');

  const end = END_RE.exec(text);
  if (end) text = text.slice(0, end.index);
  else if (/gutenberg/i.test(raw)) warnings.push('Gutenberg END marker not found; footer not stripped.');

  return { text: normalizeParagraphs(text), warnings };
}

/** Fixes common Persian text problems. Keeps the half-space (ZWNJ, U+200C). */
export function normalizePersian(text) {
  return text
    .normalize('NFKC') // folds Arabic "presentation forms" (common in PDF text) into normal letters
    .replace(/[\u064A\u0649]/g, '\u06CC') // Arabic yeh -> Persian yeh (ی)
    .replace(/\u0643/g, '\u06A9') // Arabic kaf -> Persian kaf (ک)
    .replace(/\u0640/g, '') // tatweel (stretching line)
    .replace(/[\u064B-\u0652]/g, '') // Arabic diacritics
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[\u200E\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g, '') // invisible direction marks
    .trim();
}

/** Very simple: more Arabic-script letters than Latin letters -> 'fa'. */
export function detectLanguage(text, sampleChars = 20000) {
  const sample = text.slice(0, sampleChars);
  const arabicScript = (sample.match(/[\u0600-\u06FF]/g) ?? []).length;
  const latin = (sample.match(/[A-Za-z]/g) ?? []).length;
  if (arabicScript + latin === 0) return 'unknown';
  return arabicScript > latin ? 'fa' : 'en';
}

export function looksLikeMarkdown(text) {
  return /^#{1,6}\s+\S/m.test(text);
}

/** Removes Markdown leftovers: "## " prefixes, trailing "\" line breaks, **bold**, --- rules. */
export function stripMarkdown(text) {
  return text
    .replace(/^#{1,6}[ \t]*/gm, '')
    .replace(/\\$/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/^[ \t]*[-*_]{3,}[ \t]*$/gm, '');
}

