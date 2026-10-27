const LABELS = {
  en: { chapter: 'Chapter', summary: 'Chapter summary', section: 'Section', overview: 'Book overview', themes: 'Themes', characters: 'Main characters' },
  fa: { chapter: 'فصل', summary: 'خلاصه فصل', section: 'بخش', overview: 'خلاصه کتاب', themes: 'مضامین', characters: 'شخصیت‌های اصلی' },
};

export function renderMarkdown(output) {
  const L = LABELS[output.book.language] ?? LABELS.en;
  const lines = [`# ${output.book.title}`, ''];

  if (output.overview) {
    lines.push(`## ${L.overview}`, '', output.overview.overview, '');
    lines.push(`**${L.themes}:** ${output.overview.themes.join(' | ')}`, '');
    lines.push(`**${L.characters}:**`);
    for (const c of output.overview.mainCharacters) lines.push(`- ${c.name}: ${c.role}`);
    lines.push('');
  }

  for (const ch of output.chapters) {
    lines.push(`## ${L.chapter} ${ch.index}: ${ch.title}`, '');
    lines.push(`**${L.summary}:** ${ch.summary}`, '');
    for (const s of ch.sections) lines.push(`- **${L.section} ${s.index}: ${s.title}** — ${s.summary}`);
    lines.push('');
  }
  return lines.join('\n');
}