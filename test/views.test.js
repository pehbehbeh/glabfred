import { expect, test } from "bun:test";
import { assignKeys, findView } from "../lib/views/index.js";

const project = { host: "gitlab.example.com", id: 7, path: "team/app", url: "https://gitlab.example.com/team/app", branch: "release/1.x" };

test("merge requests carry the reference to copy", () => {
  const [entry] = findView("m").toEntries([
    { iid: 12, title: "Fix login", author: { username: "anna" }, draft: true, source_branch: "fix-login", target_branch: "main", web_url: "u", updated_at: "2026-01-01T00:00:00Z" },
  ]);
  expect(entry.title).toBe("!12 Fix login");
  expect(entry.copy).toBe("!12");
  expect(entry.subtitle).toBe("anna · draft · fix-login → main");
});

test("files keep only blobs, shortest path first, with each path segment encoded in the URL", () => {
  const entries = findView("t").toEntries(
    [
      { type: "tree", path: "src", name: "src" },
      { type: "blob", path: "src/C#/what?.js", name: "what?.js" },
      { type: "blob", path: "README.md", name: "README.md" },
    ],
    project,
  );
  expect(entries.map((e) => e.copy)).toEqual(["README.md", "src/C#/what?.js"]);
  expect(entries[1].url).toBe("https://gitlab.example.com/team/app/-/blob/release/1.x/src/C%23/what%3F.js");
});

test("a configured list key with a space or a clash falls back to the default", () => {
  const views = () => [
    { id: "mrs", defaultKey: "m", aliases: "mr" },
    { id: "issues", defaultKey: "i", aliases: "issue" },
    { id: "files", defaultKey: "t", aliases: "file" },
  ];
  const keys = (configured) => assignKeys(views(), (id) => configured[id]).map((v) => v.key);
  expect(keys({ mrs: "pr", issues: "merge requests" })).toEqual(["pr", "i", "t"]);
  expect(keys({ issues: "m" })).toEqual(["m", "i", "t"]);
  expect(keys({ issues: "mr" })).toEqual(["m", "i", "t"]);
  // Moving issues away frees i for merge requests
  expect(keys({ mrs: "i", issues: "x" })).toEqual(["i", "x", "t"]);
});
