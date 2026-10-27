import { appendFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

export async function logBookError(filePath, entry) {
  await mkdir(dirname(filePath), { recursive: true });
  await appendFile(filePath, `${JSON.stringify({ timestamp: new Date().toISOString(), ...entry })}\n`, 'utf8');
}
