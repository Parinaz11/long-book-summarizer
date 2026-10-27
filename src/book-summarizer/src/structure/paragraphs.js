/** The chapter's body paragraphs (the heading line is removed). */
export function chapterParagraphs(text, chapter) {
  const paras = text
    .slice(chapter.start, chapter.end)
    .split('\n\n')
    .map((p) => p.trim())
    .filter(Boolean);
  return paras[0] === chapter.label ? paras.slice(1) : paras;
}