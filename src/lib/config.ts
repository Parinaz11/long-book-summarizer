// Branding + backend configuration. Change these in one place.
export const BRAND = {
  name: "Chapterly",
  tagline: "Great books, clearly understood.",
};

/**
 * Base URL of the Node.js book-summarizer HTTP API.
 * Set VITE_API_BASE_URL to connect; when empty, the app runs in demo mode.
 */
export const API_BASE_URL: string = (import.meta.env["VITE_API_BASE_URL"] as string | undefined) ?? "http://localhost:8787";

export const DEMO_MODE = import.meta.env["VITE_DEMO_MODE"] === "true";

export const LANGUAGES = {
  en: { label: "English", native: "English", dir: "ltr" as const },
  fa: { label: "Persian", native: "فارسی", dir: "rtl" as const },
};
