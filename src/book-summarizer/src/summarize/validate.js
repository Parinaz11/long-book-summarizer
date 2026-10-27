/** Returns a list of problems (empty = sections tile paragraphs 1..n perfectly). */
export function validateSections(sections, n) {
  if (sections.length === 0) return ['sections is empty'];
  const problems = [];
  let expected = 1;
  sections.forEach((s, i) => {
    if (s.startParagraph !== expected) {
      problems.push(`section ${i + 1} ("${s.title}") starts at paragraph ${s.startParagraph} but must start at ${expected}`);
    }
    if (s.endParagraph < s.startParagraph) {
      problems.push(`section ${i + 1} ends (${s.endParagraph}) before it starts (${s.startParagraph})`);
    }
    expected = s.endParagraph + 1;
  });
  const last = sections[sections.length - 1].endParagraph;
  if (last !== n) problems.push(`the last section ends at paragraph ${last} but the chapter has ${n} paragraphs`);
  return problems;
}

/** Last resort when the model keeps getting the ranges wrong: force them to tile 1..n. */
export function repairSections(sections, n) {
  const sorted = [...sections].sort((a, b) => a.startParagraph - b.startParagraph);
  const kept = [];
  for (const s of sorted) {
    const prevStart = kept.length ? kept[kept.length - 1].startParagraph : 0;
    const start = kept.length === 0 ? 1 : Math.max(s.startParagraph, prevStart + 1);
    if (start > n) continue;
    kept.push({ ...s, startParagraph: start });
  }
  if (kept.length === 0) kept.push({ title: 'Whole chapter', summary: '', startParagraph: 1, endParagraph: n });
  kept.forEach((s, i) => {
    s.endParagraph = i + 1 < kept.length ? kept[i + 1].startParagraph - 1 : n;
  });
  return kept;
}

export function validateTitle(title) {
  const t = title.trim();
  if (!t) return ['chapterTitle is empty'];
  if (/^(?:chapter|فصل|باب)(?!\p{L})/iu.test(t) || /^[IVXLCDM\d]+\.?$/.test(t)) {
    return ['chapterTitle must be a descriptive title, not "Chapter ..." or a number'];
  }
  return [];
}