import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { join } from 'node:path';
import { createHash } from 'node:crypto';

export function hashOf(value) {
  const s = typeof value === 'string' ? value : JSON.stringify(value);
  return createHash('sha256').update(s).digest('hex').slice(0, 16);
}

export function createStore(dir) {
  const file = (name) => join(dir, `${name}.json`);
  return {
    async read(name) {
      try {
        return JSON.parse(await readFile(file(name), 'utf8'));
      } catch {
        return null; // missing or corrupted file -> just recompute
      }
    },
    async write(name, data) {
      await mkdir(dir, { recursive: true });
      const tmp = `${file(name)}.tmp`;
      await writeFile(tmp, JSON.stringify(data, null, 2), 'utf8');
      await rename(tmp, file(name)); // write-then-rename: a crash can't leave a half-written file
    },
  };
}

/** Run compute() unless a checkpoint with the SAME key already exists. */
export async function cached(store, name, key, compute, { force = false, log = () => {} } = {}) {
  if (!force) {
    const hit = await store.read(name);
    if (hit?.key === key) {
      log(`  ${name}: reused from checkpoint`);
      return { ...hit.value, fromCache: true };
    }
  }
  const value = await compute();
  await store.write(name, { key, savedAt: new Date().toISOString(), value });
  return { ...value, fromCache: false };
}