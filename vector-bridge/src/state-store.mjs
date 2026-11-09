import { readFile, rename, writeFile } from 'node:fs/promises';

const EMPTY_STATE = Object.freeze({ ordersCursor: null, itemsCursor: null });

export async function loadState(filePath) {
  try {
    const parsed = JSON.parse(await readFile(filePath, 'utf8'));
    return {
      ordersCursor: typeof parsed?.ordersCursor === 'string' ? parsed.ordersCursor : null,
      itemsCursor: typeof parsed?.itemsCursor === 'string' ? parsed.itemsCursor : null,
    };
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return { ...EMPTY_STATE };
    throw new Error(`Could not read companion state: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function saveState(filePath, state) {
  const tempPath = `${filePath}.tmp`;
  await writeFile(tempPath, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  await rename(tempPath, filePath);
}

export function newestCursor(previous, rows) {
  const newest = rows.at(-1)?.created_at;
  return typeof newest === 'string' ? newest : previous;
}
