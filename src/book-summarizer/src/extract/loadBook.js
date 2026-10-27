import { readFile } from 'node:fs/promises';
import {
  cleanGutenberg, normalizePersian, detectLanguage, looksLikeMarkdown, stripMarkdown,
} from './text.js';
import { isolateHeadings } from '../structure/detectChapters.js';

export async function loadBook(filePath) {
  let raw = (await readFile(filePath, 'utf8')).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');

  const language = detectLanguage(raw);
  if (language === 'fa') raw = normalizePersian(raw);
  if (looksLikeMarkdown(raw)) raw = stripMarkdown(raw);
  raw = isolateHeadings(raw); // headings become their own paragraphs BEFORE lines are glued

  const { text, warnings } = cleanGutenberg(raw);
  return { text, language, warnings };
}


// import { readFile } from 'node:fs/promises';
// import { cleanGutenberg, normalizePersian, detectLanguage } from './text.js';

// export async function loadBook(filePath) {
//   const raw = await readFile(filePath, 'utf8');
//   const { text: cleaned, warnings } = cleanGutenberg(raw);
//   const language = detectLanguage(cleaned);
//   const text = language === 'fa' ? normalizePersian(cleaned) : cleaned;
//   return { text, language, warnings };
// }