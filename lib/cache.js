import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

// A crashed refresh leaves its lock behind; ignore locks older than this
const LOCK_TIMEOUT = 5 * 60 * 1000;
// A cache that holds an error is refreshed again after this, instead of showing the error for the whole ttl
const ERROR_TTL = 30 * 1000;

const cacheDir = process.env.alfred_workflow_cache ?? `${process.env.HOME}/Library/Caches/io.pbb.glabfred`;
mkdirSync(cacheDir, { recursive: true });

const cachePath = (name) => `${cacheDir}/${name}.json`;

const age = (file) => {
  try {
    return Date.now() - statSync(file).mtimeMs;
  } catch {
    return Infinity;
  }
};

export async function readCache(name) {
  try {
    return JSON.parse(await readFile(cachePath(name), "utf8"));
  } catch {
    return undefined;
  }
}

const relaunch = () => [process.execPath, fileURLToPath(new URL("../main.js", import.meta.url))];

// Returns the cached value right away and refreshes it in the background when it is older than ttl
export async function cached(name, ttl, refreshArgs) {
  const file = cachePath(name);
  const lock = `${file}.lock`;
  const cache = await readCache(name);
  let loading = age(lock) < LOCK_TIMEOUT;
  if (!loading && age(file) > (cache?.error ? Math.min(ttl, ERROR_TTL) : ttl)) {
    // Any lock still here is left over from a crashed refresh
    rmSync(lock, { force: true });
    // Lock before spawning, otherwise Alfred's next rerun spawns a second refresh. wx fails when a parallel run took the lock first
    try {
      await writeFile(lock, "", { flag: "wx" });
    } catch {
      return { cache, loading: true };
    }
    // Detach via nohup so Alfred neither waits for nor kills the refresh
    spawnSync("sh", ["-c", 'nohup "$0" "$@" >/dev/null 2>&1 &', ...relaunch(), "--refresh", name, ...refreshArgs]);
    loading = true;
  }
  return { cache, loading };
}

// Writes atomically so a script filter run never reads a half-written file
export async function writeRefresh(name, compute) {
  const file = cachePath(name);
  try {
    // One tmp file per process, in case a refresh outlives LOCK_TIMEOUT and a second one runs alongside it
    const tmp = `${file}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(await compute()));
    renameSync(tmp, file);
  } finally {
    rmSync(`${file}.lock`, { force: true });
  }
}

// Leaves the locks alone, so a refresh that is still running finishes and writes its result
export function clearCache() {
  for (const file of readdirSync(cacheDir)) if (file.endsWith(".json")) rmSync(`${cacheDir}/${file}`, { force: true });
}
