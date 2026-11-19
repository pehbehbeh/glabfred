import { expect, test } from "bun:test";
import { fetchMine, findMine, mineItems } from "../lib/mine.js";
import { route } from "../lib/router.js";

const mr = (iid, updated) => ({
  iid,
  title: `MR ${iid}`,
  references: { short: `!${iid}`, full: `team/app!${iid}` },
  author: { username: "anna" },
  source_branch: "fix",
  web_url: `https://gitlab.example.com/team/app/-/merge_requests/${iid}`,
  updated_at: updated,
});

test("my merge requests merge created and assigned ones without duplicates, newest first", async () => {
  const glab = {
    loggedInHosts: async () => ["gitlab.example.com"],
    api: async (host, endpoint) =>
      endpoint.includes("created_by_me") ? [mr(1, "2026-01-01T00:00:00Z"), mr(2, "2026-03-01T00:00:00Z")] : [mr(2, "2026-03-01T00:00:00Z")],
  };
  const { data } = await fetchMine(glab, findMine("M"));
  expect(data.map((e) => e.title)).toEqual(["!2 MR 2", "!1 MR 1"]);
  expect(data[0].subtitle).toBe("team/app · anna · fix");
  expect(data[0].copy).toBe("team/app!2");
  expect(data[0].host).toBe("gitlab.example.com");
});

test("review requests ask each host for its own username", async () => {
  const calls = [];
  const glab = {
    loggedInHosts: async () => ["a.example.com", "b.example.com"],
    api: async (host, endpoint) => {
      calls.push(`${host} ${endpoint}`);
      return endpoint === "user" ? { username: host === "a.example.com" ? "anna" : "a.berg" } : [];
    },
  };
  await fetchMine(glab, findMine("R"));
  expect(calls.filter((c) => c.includes("reviewer_username"))).toEqual([
    "a.example.com merge_requests?scope=all&state=opened&reviewer_username=anna&per_page=100",
    "b.example.com merge_requests?scope=all&state=opened&reviewer_username=a.berg&per_page=100",
  ]);
});

test("the capital key opens the list, lowercase still searches projects", () => {
  const r = route("R login", []);
  expect(r.type).toBe("mine");
  expect(r.view.id).toBe("review_requests");
  expect(r.filter).toBe("login");
  expect(route("r login", []).type).toBe("projects");
});

test("the key alone opens the list without a trailing space", () => {
  expect(route("R", [])).toMatchObject({ type: "mine", filter: "" });
  expect(route("r", []).type).toBe("projects");
  expect(route("Rails", []).type).toBe("projects");
});

test("the lists show above the projects only on an empty query", () => {
  expect(mineItems("").map((i) => i.autocomplete)).toEqual(["M ", "I ", "R "]);
  expect(mineItems("I")).toEqual([]);
});
