import { expect, test } from "bun:test";
import { exactNumberFirst, numberQuery, search } from "../lib/alfred.js";

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
