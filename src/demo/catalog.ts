// DEMO catalog metadata. Kept apart from UI so it can be swapped for the
// real GET /api/books response. Covers are typographic (no remote images).
import type { Book } from "@/lib/types";

export const DEMO_BOOKS: Book[] = [
  {
    id: "dorian-gray",
    title: "The Picture of Dorian Gray",
    author: "Oscar Wilde",
    language: "en",
    genre: "Gothic fiction",
    year: 1890,
    description: "A beautiful young man trades his soul so that a portrait ages in his place.",
    cover: { palette: ["oklch(0.32 0.06 20)", "oklch(0.78 0.1 75)"] },
  },
  {
    id: "alice-fa",
    title: "ماجراجویی های آلیس در سرزمین عجایب",
    author: "لوئیس کارول",
    language: "fa",
    genre: "فانتزی",
    year: 1865,
    description: "سفر رؤیاگونهٔ آلیس به سرزمینی که در آن هیچ چیز آن‌طور که به نظر می‌رسد نیست.",
    cover: { palette: ["oklch(0.4 0.08 230)", "oklch(0.88 0.06 90)"] },
  },
  {
    id: "frankenstein",
    title: "Frankenstein",
    author: "Mary Shelley",
    language: "en",
    genre: "Gothic fiction",
    year: 1818,
    description: "A young scientist creates life — and is haunted by what he has made.",
    cover: { palette: ["oklch(0.28 0.04 160)", "oklch(0.82 0.08 140)"] },
  },
  {
    id: "pride-prejudice",
    title: "Pride and Prejudice",
    author: "Jane Austen",
    language: "en",
    genre: "Romance",
    year: 1813,
    description: "Elizabeth Bennet and Mr. Darcy misjudge each other, wittily and at length.",
    cover: { palette: ["oklch(0.55 0.09 350)", "oklch(0.95 0.03 80)"] },
  },
  {
    id: "golestan",
    title: "گلستان",
    author: "سعدی شیرازی",
    language: "fa",
    genre: "ادبیات کلاسیک",
    year: 1258,
    description: "حکایت‌هایی کوتاه و پندآموز به نثر و نظم از شیخ اجل سعدی.",
    cover: { palette: ["oklch(0.36 0.07 150)", "oklch(0.8 0.12 85)"] },
  },
  {
    id: "moby-dick",
    title: "Moby-Dick",
    author: "Herman Melville",
    language: "en",
    genre: "Adventure",
    year: 1851,
    description: "Captain Ahab's obsessive hunt for the white whale across the open sea.",
    cover: { palette: ["oklch(0.3 0.05 250)", "oklch(0.86 0.04 230)"] },
  },
];

/** Demo-only stats used to simulate estimates and progress. */
export const DEMO_BOOK_STATS: Record<
  string,
  { characters: number; chapters: number; actualPromptTokens: number; actualOutputTokens: number; chapterTitles?: string[] }
> = {
  "dorian-gray": {
    characters: 465812,
    chapters: 20,
    actualPromptTokens: 130562,
    actualOutputTokens: 28448,
    chapterTitles: ["The Artist and His Fascinating Portrait", "Lord Henry Influences Dorian Gray at the Studio", "Lord Henry Learns Dorian's Origins and Captivates Him", "Dorian Falls in Love with an Actress", "Sibyl Vane's Engagement and James's Departure", "Dinner Discussion Regarding Dorian Gray's Engagement", "Sibyl Vane's Tragic Failure and the Altered Portrait", "The Discovery of Sibyl Vane's Death", "Basil Visits Dorian and Makes a Confession", "Hiding the Portrait and the Poisonous Book", "The Influence of the Poisonous Book", "Basil Hallward Confronts Dorian Gray", "Dorian Shows Basil the Portrait and Commits Murder", "Blackmail and the Disposal of Basil's Body", "Dorian Dines Out and Destroys Evidence", "Seeking Oblivion in London's Opium Dens", "Dorian Faints at the Conservatory After Seeing James Vane", "The Death of James Vane", "Dorian Discusses Confessions and Morality with Lord Henry", "The Destruction of the Cursed Portrait"],
  },
  "alice-fa": {
    characters: 170000,
    chapters: 12,
    actualPromptTokens: 69172,
    actualOutputTokens: 18342,
    chapterTitles: ["سقوط آلیس به سرزمین عجایب", "برکه اشک ها و ماجرای موش", "مسابقه بی‌قاعده و قهر موش", "خرگوش سفید و ماجراجویی‌های خانه", "پند و اندرز کرم ابریشم و تغییرات آلیس", "ورود به خانه دوشس و دیدار با گربه چشایر", "مهمانی چای دیوانه‌وار و بازگشت آلیس به تالار", "زمین کروکت ملکه و گربه چشایر", "دیدار با دوشس و آشنایی با لاک‌پشت قلابی", "رقص خرچنگ‌ها و ترانهٔ سوپ لاک‌پشت", "محاکمه بزرگ و شهادت کلاه‌دوز در دادگاه", "شهادت آلیس و بیدار شدن از خواب"],
  },
  frankenstein: { characters: 438000, chapters: 24, actualPromptTokens: 118000, actualOutputTokens: 33000 },
  "pride-prejudice": { characters: 711000, chapters: 61, actualPromptTokens: 190000, actualOutputTokens: 86000 },
  golestan: { characters: 160000, chapters: 8, actualPromptTokens: 64000, actualOutputTokens: 12000 },
  "moby-dick": { characters: 1240000, chapters: 135, actualPromptTokens: 330000, actualOutputTokens: 190000 },
};
