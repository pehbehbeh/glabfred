import { expect, test } from "bun:test";
import { search } from "../lib/alfred.js";

test("entries whose title matches come before path-only matches", () => {
  const entries = [
    { title: ".gitignore", haystack: "storage/logs/.gitignore" },
    { title: "StorageLocation.php", haystack: "app/Models/StorageLocation.php" },
    { title: "README.md", haystack: "README.md" },
  ];
  expect(search(entries, "storage").map((e) => e.title)).toEqual(["StorageLocation.php", ".gitignore"]);
});
