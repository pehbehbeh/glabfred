import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, renameSync, rmSync, statSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { errorText } from "./glab.js";

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

// Returns the cached value right away and refreshes it in the background when it is older than ttl, or when isStale says so
export async function cached(name, ttl, refreshArgs, isStale = () => false) {
  const file = cachePath(name);
  const lock = `${file}.lock`;
  const cache = await readCache(name);
  let loading = age(lock) < LOCK_TIMEOUT;
  if (!loading && (age(file) > (cache?.error ? Math.min(ttl, ERROR_TTL) : ttl) || (cache && isStale(cache)))) {
    // A lock still here is left over from a crashed refresh. Checked again, so a lock a parallel run just took survives
    if (age(lock) !== Infinity && age(lock) >= LOCK_TIMEOUT) rmSync(lock, { force: true });
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

// Keys are typed queries, so "constructor" or "__proto__" must not hit Object.prototype
const own = (map, key) => (map && Object.hasOwn(map, key) ? map[key] : undefined);

const isFresh = (entry, ttl) => entry && Date.now() - entry.time < (entry.error ? Math.min(ttl, ERROR_TTL) : ttl);

// A remembered query: one cache file holds a result per key (a looked-up number, a code search), and the key is passed
// to the refresh as its last argument. While typing 123, a refresh still running for 1 holds the lock, so 12 is skipped.
// failed is an error of the whole refresh (project gone). It is retried like any cache that holds an error,
// not on every key typed, and it shows as the result instead of a loading row that never ends
export async function cachedKey(name, key, { ttl }, refreshArgs) {
  const { cache, loading } = await cached(name, ttl, [...refreshArgs, key], (c) => !c.error && !isFresh(own(c.keys, key), ttl));
  const entry = own(cache?.keys, key);
  const failed = entry ? undefined : cache?.error;
  return { entry, failed, loading: !entry && !failed && loading };
}

// Entries with data live for keep, misses and errors only while fresh, so typos don't pile up
export async function refreshKey(previous, key, { ttl, keep = ttl }, fetch) {
  let entry;
  try {
    entry = { data: await fetch() };
  } catch (error) {
    // A network blip keeps what was found before
    entry = { data: own(previous?.keys, key)?.data ?? [], error: errorText(error) };
  }
  const kept = (e) => (e.data.length > 0 ? Date.now() - e.time < keep : isFresh(e, ttl));
  const others = Object.entries(previous?.keys ?? {}).filter(([k, e]) => k !== key && kept(e));
  return { keys: Object.fromEntries([...others, [key, { ...entry, time: Date.now() }]]) };
}

export const remembered = async (name) => Object.values((await readCache(name))?.keys ?? {}).flatMap((e) => e.data ?? []);

// Leaves the locks alone, so a refresh that is still running finishes and writes its result
export function clearCache() {
  for (const file of readdirSync(cacheDir)) if (file.endsWith(".json")) rmSync(`${cacheDir}/${file}`, { force: true });
}
