import { expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

// cache.js reads the cache dir at import time
const dir = mkdtempSync(`${tmpdir()}/glabfred-test-`);
process.env.alfred_workflow_cache = dir;
const { cached, cachedKey, refreshKey, remembered, writeRefresh } = await import("../lib/cache.js");

const HOUR = 60 * 60 * 1000;
const put = (name, value) => writeFileSync(`${dir}/${name}.json`, JSON.stringify(value));
const backdate = (file, ms) => utimesSync(file, new Date(Date.now() - ms), new Date(Date.now() - ms));

test("a fresh cache comes back without a refresh", async () => {
  put("fresh", { data: [1] });
  expect(await cached("fresh", HOUR, [])).toEqual({ cache: { data: [1] }, loading: false });
  expect(existsSync(`${dir}/fresh.json.lock`)).toBe(false);
});

test("a stale cache comes back right away and locks for the refresh", async () => {
  put("stale", { data: [1] });
  backdate(`${dir}/stale.json`, 2 * HOUR);
  expect(await cached("stale", HOUR, [])).toEqual({ cache: { data: [1] }, loading: true });
  expect(existsSync(`${dir}/stale.json.lock`)).toBe(true);
});

test("a cache holding an error is refreshed again after 30 seconds", async () => {
  put("failed-before", { data: [1], error: "connection refused" });
  backdate(`${dir}/failed-before.json`, 31 * 1000);
  expect((await cached("failed-before", HOUR, [])).loading).toBe(true);
});

test("a running refresh is not started twice", async () => {
  put("running", { data: [1] });
  backdate(`${dir}/running.json`, 2 * HOUR);
  writeFileSync(`${dir}/running.json.lock`, "busy");
  expect((await cached("running", HOUR, [])).loading).toBe(true);
  expect(readFileSync(`${dir}/running.json.lock`, "utf8")).toBe("busy");
});

test("a lock left by a crashed refresh is ignored after 5 minutes", async () => {
  put("crashed", { data: [1] });
  writeFileSync(`${dir}/crashed.json.lock`, "");
  backdate(`${dir}/crashed.json.lock`, 6 * 60 * 1000);
  expect((await cached("crashed", HOUR, [])).loading).toBe(false);
});

test("writeRefresh stores the result and removes the lock, even when it fails", async () => {
  writeFileSync(`${dir}/done.json.lock`, "");
  await writeRefresh("done", async () => ({ data: [2] }));
  expect((await cached("done", HOUR, [])).cache).toEqual({ data: [2] });
  expect(existsSync(`${dir}/done.json.lock`)).toBe(false);

  writeFileSync(`${dir}/failed.json.lock`, "");
  await expect(writeRefresh("failed", async () => { throw new Error("boom"); })).rejects.toThrow();
  expect(existsSync(`${dir}/failed.json.lock`)).toBe(false);
});

test("a fresh cache that isStale rejects is refreshed", async () => {
  put("other-number", { number: "1", data: [] });
  expect((await cached("other-number", HOUR, [], (c) => c.number !== "12")).loading).toBe(true);
  put("same-number", { number: "12", data: [] });
  expect((await cached("same-number", HOUR, [], (c) => c.number !== "12")).loading).toBe(false);
});

const LOOKUP = { ttl: HOUR, keep: 30 * 24 * HOUR };
const hit = (data, ago = 0, extra = {}) => ({ data, time: Date.now() - ago, ...extra });

test("a fresh remembered key comes back without a refresh", async () => {
  put("key-fresh", { keys: { 12: hit([1]) } });
  const { entry, failed, loading } = await cachedKey("key-fresh", "12", LOOKUP, ["x"]);
  expect([entry.data, failed, loading]).toEqual([[1], undefined, false]);
  expect(existsSync(`${dir}/key-fresh.json.lock`)).toBe(false);
});

test("a key not remembered yet is refreshed", async () => {
  put("key-other", { keys: { 1: hit([1]) } });
  expect(await cachedKey("key-other", "12", LOOKUP, ["x"])).toEqual({ entry: undefined, failed: undefined, loading: true });
  expect(existsSync(`${dir}/key-other.json.lock`)).toBe(true);
});

test("a key typed while a refresh runs is skipped", async () => {
  put("key-busy", { keys: { 1: hit([1]) } });
  writeFileSync(`${dir}/key-busy.json.lock`, "busy");
  expect((await cachedKey("key-busy", "12", LOOKUP, ["x"])).loading).toBe(true);
  expect(readFileSync(`${dir}/key-busy.json.lock`, "utf8")).toBe("busy");
});

test("a remembered error is retried after 30 seconds", async () => {
  put("key-error", { keys: { 12: hit([], 31 * 1000, { error: "connection refused" }) } });
  expect((await cachedKey("key-error", "12", LOOKUP, ["x"])).entry.error).toBe("connection refused");
  expect(existsSync(`${dir}/key-error.json.lock`)).toBe(true);
});

test("an error of the whole refresh is shown, and not retried on every key", async () => {
  put("key-failed", { error: "Project not found" });
  expect(await cachedKey("key-failed", "12", LOOKUP, ["x"])).toEqual({ entry: undefined, failed: "Project not found", loading: false });
  expect(existsSync(`${dir}/key-failed.json.lock`)).toBe(false);
});

test("refreshKey keeps the previous data next to an error", async () => {
  const previous = { keys: { 12: hit([1], 2 * HOUR) } };
  const { keys } = await refreshKey(previous, "12", LOOKUP, async () => { throw new Error("offline"); });
  expect([keys[12].data, keys[12].error]).toEqual([[1], "offline"]);
});

test("refreshKey keeps hits for keep, misses and errors only while fresh", async () => {
  const previous = {
    keys: { 1: hit([1], 2 * HOUR), 2: hit([2], 31 * 24 * HOUR), 3: hit([], 2 * HOUR), 4: hit([], 0), 5: hit([], 31 * 1000, { error: "x" }) },
  };
  const { keys } = await refreshKey(previous, "12", LOOKUP, async () => [12]);
  expect(Object.keys(keys).sort()).toEqual(["1", "12", "4"]);
  // Without keep, hits go once stale too
  expect(Object.keys((await refreshKey(previous, "12", { ttl: HOUR }, async () => [])).keys).sort()).toEqual(["12", "4"]);
});

test("a typed key can't reach Object.prototype", async () => {
  const { keys } = await refreshKey(undefined, "__proto__", LOOKUP, async () => [1]);
  put("key-proto", { keys });
  expect((await cachedKey("key-proto", "__proto__", LOOKUP, ["x"])).entry.data).toEqual([1]);
  expect((await cachedKey("key-proto", "constructor", LOOKUP, ["x"])).entry).toBeUndefined();
  expect(await remembered("key-proto")).toEqual([1]);
});
