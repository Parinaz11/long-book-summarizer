// export const PROMPT_VERSION = 'v1'; // bump when you change a prompt: old checkpoints become invalid
export const PROMPT_VERSION = 'v2';

const LANG_NAMES = { fa: 'Persian (Farsi)', en: 'English' };
const langName = (language) => LANG_NAMES[language] ?? 'the same language as the book';

export function chapterSystemPrompt(language) {
  return [
    'You are a careful literary analyst who summarizes books faithfully.',
    'Rules:',
    '- Use ONLY information from the provided text and the story-so-far notes. Never add outside knowledge.',
    '- Keep character names exactly as they appear in the book. Do not translate or alter them.',
    '- Preserve the order of events and the relationships between characters.',
    `- Write ALL summaries and titles in ${langName(language)}.`,
    '- Output only the JSON object requested, nothing else.',
  ].join('\n');
}

function sectionRange(n) {
  if (n <= 3) return [1, 1];
  const max = Math.min(8, Math.max(3, Math.round(n / 20)));
  return [Math.min(3, max), max];
}

export function chapterUserPrompt({ title, language, chapter, paragraphs, state, feedback = [] }) {
  const n = paragraphs.length;
  const [minS, maxS] = sectionRange(n);
  const numbered = paragraphs.map((p, i) => `[P${i + 1}] ${p}`).join('\n\n');
  const characters = state.characters.length
    ? state.characters.map((c) => `- ${c.name}: ${c.role}`).join('\n')
    : '(none yet)';

  let prompt = `BOOK: ${title}

STORY SO FAR (chapters before this one):
${state.storySoFar || '(This is the first chapter.)'}

KNOWN CHARACTERS:
${characters}

CURRENT CHAPTER: ${chapter.label}. It has ${n} numbered paragraphs, [P1] to [P${n}].
-----
${numbered}
-----

TASK:
1. chapterTitle: a short DESCRIPTIVE title (3 to 8 words) that says what happens in this chapter, for example "A Stranger Arrives at the Harbor". Do NOT use the word "Chapter" or a chapter number in the title.
2. chapterSummary: a summary of about 120-200 words: key events in order, themes, what happens to the characters.
3. sections: split the chapter into consecutive sections by scene or topic. Together the sections must cover EVERY paragraph from 1 to ${n} exactly once, in order, with no gaps and no overlaps: the first section starts at paragraph 1, each next section starts right after the previous one ends, and the last section ends at paragraph ${n}. Use ${minS} to ${maxS} sections. Each section needs a title, a 1-2 sentence summary, startParagraph and endParagraph.
4. storySoFar: rewrite the STORY SO FAR notes so they also include THIS chapter. At most about 250 words, chronological, naming the key characters and their relationships.
5. characters: the updated list of important characters so far (name + one-line role). Keep earlier characters and add new ones.`;

  if (feedback.length) {
    prompt += `\n\nYOUR PREVIOUS ANSWER WAS REJECTED. Fix these problems:\n${feedback.map((f) => `- ${f}`).join('\n')}`;
  }
  return prompt;
}

export function overviewSystemPrompt(language) {
  return [
    'You are a careful literary analyst. You write a faithful overview of a whole book from its chapter summaries.',
    'Use only the information given. Keep character names exactly as given.',
    `Write in ${langName(language)}. Output only the JSON object requested.`,
  ].join('\n');
}

export function overviewUserPrompt({ title, chapters, feedback = [] }) {
  const list = chapters.map((c) => `Chapter ${c.index} - ${c.title}\n${c.summary}`).join('\n\n');
  let prompt = `BOOK: ${title}

CHAPTER SUMMARIES:
${list}

TASK: Return overview (a 200-300 word summary of the whole book, in order), themes (3-6 short phrases), and mainCharacters (name + one-line role).`;
  if (feedback.length) {
    prompt += `\n\nYOUR PREVIOUS ANSWER WAS REJECTED. Fix these problems:\n${feedback.map((f) => `- ${f}`).join('\n')}`;
  }
  return prompt;
}