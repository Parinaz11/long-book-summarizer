// Models often wrap JSON in ```json fences or add chatter. Pull out the JSON object.
export function extractJson(text) {
  const t = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim();
  const first = t.indexOf('{');
  const last = t.lastIndexOf('}');
  return first !== -1 && last > first ? t.slice(first, last + 1) : t;
}