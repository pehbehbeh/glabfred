import { expect, test } from "bun:test";
import { exactNumberFirst, listItems, numberQuery, search } from "../lib/alfred.js";

test("entries whose title matches come before path-only matches", () => {
  const entries = [
    { title: ".gitignore", haystack: "storage/logs/.gitignore" },
    { title: "storage.js", haystack: "src/storage.js" },
    { title: "README.md", haystack: "README.md" },
  ];
  expect(search(entries, "storage").map((e) => e.title)).toEqual(["storage.js", ".gitignore"]);
});

test("a number query finds its exact entry first", () => {
  expect(["42", "#42", "!42", " 42 ", "042"].map(numberQuery)).toEqual(["42", "42", "42", "42", "42"]);
  expect(["42 fix", "#", "abc"].map(numberQuery)).toEqual([undefined, undefined, undefined]);
  const entries = [{ iid: 123 }, { iid: 512 }, { iid: 12 }];
  expect(exactNumberFirst(entries, "12").map((e) => e.iid)).toEqual([12, 123, 512]);
});

const entry = (n) => ({ title: `Entry ${n}`, url: `https://x/${n}` });
const titles = ({ items }) => items.map((i) => i.title);

test("a list shows loading first, then errors next to the entries", () => {
  const result = listItems({ entries: [entry(1)], loading: "issue 12", rerun: true, errors: [undefined, "offline", false] });
  expect(titles(result)).toEqual(["Loading issue 12 via glab…", "Could not load from GitLab", "Entry 1"]);
  expect(result.rerun).toBe(true);
});

test("the empty row shows once loaded and nothing matched, not while loading", () => {
  const empty = { title: "No issues found" };
  expect(titles(listItems({ entries: [], empty }))).toEqual(["No issues found"]);
  expect(listItems({ entries: [], empty }).items[0].valid).toBe(false);
  expect(titles(listItems({ entries: [], empty, loading: "issue 12" }))).toEqual(["Loading issue 12 via glab…"]);
  expect(titles(listItems({ entries: [], empty: undefined }))).toEqual([]);
});

test("a list shows at most 200 entries", () => {
  const entries = Array.from({ length: 250 }, (_, i) => entry(i));
  expect(listItems({ entries }).items.length).toBe(200);
  expect(listItems({ entries, toItems: (shown) => shown.map((e) => ({ title: e.title })) }).items.length).toBe(200);
});
