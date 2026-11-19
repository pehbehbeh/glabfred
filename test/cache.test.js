import { expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync, utimesSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";

// cache.js reads the cache dir at import time
const dir = mkdtempSync(`${tmpdir()}/glabfred-test-`);
process.env.alfred_workflow_cache = dir;
const { cached, writeRefresh } = await import("../lib/cache.js");

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
