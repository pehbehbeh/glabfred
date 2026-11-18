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

test("tags link to their page and carry the name to copy", () => {
  const [newest, older] = findView("tag").toEntries(
    [
      { name: "v1.0.0", message: "", release: null, commit: { title: "Initial release", committed_date: "2026-01-01T00:00:00Z" } },
      { name: "release/v1.1", message: "Spring", release: { tag_name: "release/v1.1" }, commit: { title: "Add search", committed_date: "2026-03-01T00:00:00Z" } },
    ],
    project,
  );
  expect(newest.title).toBe("release/v1.1");
  expect(newest.subtitle).toBe("release · Add search");
  expect(newest.url).toBe("https://gitlab.example.com/team/app/-/tags/release/v1.1");
  expect(older.copy).toBe("v1.0.0");
});

test("commits are searchable by short SHA, title and author", () => {
  const [entry] = findView("c").toEntries([
    { short_id: "a1b2c3d", title: "Fix cart total", author_name: "Anna", web_url: "u", committed_date: "2026-01-01T00:00:00Z" },
  ]);
  expect(entry.copy).toBe("a1b2c3d");
  expect(entry.subtitle).toBe("a1b2c3d · Anna");
  expect(entry.haystack).toBe("a1b2c3d Fix cart total Anna");
});

test("releases fall back to the tag name and copy the tag", () => {
  const [named, unnamed] = findView("r").toEntries([
    { name: "Spring release", tag_name: "v1.1.0", description: "Adds search", author: { username: "anna" }, _links: { self: "u1" }, released_at: "2026-03-01T00:00:00Z" },
    { name: "", tag_name: "v1.0.0", description: null, author: { username: "anna" }, _links: { self: "u2" }, released_at: "2026-01-01T00:00:00Z" },
  ]);
  expect(named.subtitle).toBe("v1.1.0 · anna");
  expect(named.copy).toBe("v1.1.0");
  expect(unnamed.title).toBe("v1.0.0");
  expect(unnamed.url).toBe("u2");
  expect(unnamed.subtitle).toBe("anna");
});

test("milestones sort by due date and copy GitLab's reference", () => {
  const entries = findView("milestone").toEntries([
    { title: "Backlog", due_date: null, expired: false, group_id: 9, web_url: "u1" },
    { title: "Spring release", due_date: "2026-03-01", expired: true, web_url: "u2" },
  ]);
  expect(entries.map((e) => e.title)).toEqual(["Spring release", "Backlog"]);
  expect(entries[0].subtitle).toBe("due 2026-03-01 · overdue");
  expect(entries[0].copy).toBe('%"Spring release"');
  expect(entries[1].copy).toBe("%Backlog");
  expect(entries[1].subtitle).toBe("group");
});

test("environments link to their page and copy the deployed URL", () => {
  const [prod, review] = findView("e").toEntries(
    [
      { id: 3, name: "production", tier: "production", external_url: "https://shop.example.com", updated_at: "2026-03-01T00:00:00Z" },
      { id: 4, name: "review/cart", tier: "development", external_url: null, updated_at: "2026-01-01T00:00:00Z" },
    ],
    project,
  );
  expect(prod.url).toBe("https://shop.example.com");
  expect(prod.cmdUrl).toBe("https://gitlab.example.com/team/app/-/environments/3");
  expect(review.url).toBe("https://gitlab.example.com/team/app/-/environments/4");
  expect(review.cmdUrl).toBe(undefined);
  expect(prod.subtitle).toBe("production · https://shop.example.com");
  expect(prod.copy).toBe("https://shop.example.com");
  expect(review.copy).toBe("review/cart");
});

test("wiki pages encode their slug in the URL", () => {
  const [faq] = findView("w").toEntries([{ title: "FAQ & Tipps für Einsteiger", slug: "FAQ-&-Tipps-für-Einsteiger" }], project);
  expect(faq.url).toBe("https://gitlab.example.com/team/app/-/wikis/FAQ-%26-Tipps-f%C3%BCr-Einsteiger");
  expect(faq.copy).toBe("FAQ-&-Tipps-für-Einsteiger");
});
