import { expect, test } from "bun:test";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { refresh, scriptFilter } from "../lib/app.js";

// Every cache below is fresh, so scriptFilter never spawns a refresh
const dir = process.env.alfred_workflow_cache;

const put = (name, value) => writeFileSync(`${dir}/${name}.json`, JSON.stringify(value));
const read = (name) => JSON.parse(readFileSync(`${dir}/${name}.json`, "utf8"));
const run = async (query) => JSON.parse(await scriptFilter(query));
const titles = (result) => result.items.map((i) => i.title);

const project = { host: "gitlab.example.com", id: 1, name: "Team / App", path: "team/app", url: "https://gitlab.example.com/team/app", branch: "main" };
put("projects", { data: [project] });

const issue = (iid, title, state = "opened") => ({
  iid,
  title,
  state,
  labels: [],
  assignees: [],
  web_url: `${project.url}/-/issues/${iid}`,
  updated_at: "2026-01-01T00:00:00Z",
});
const entry = (iid, title) => ({ title: `#${iid} ${title}`, iid, url: `${project.url}/-/issues/${iid}`, copy: `#${iid}`, haystack: `#${iid} ${title}` });
const httpError = (stderr) => Object.assign(new Error("exit 1"), { stderr });

test("an empty query shows the lists on all hosts above the projects", async () => {
  const result = await run("");
  expect(titles(result)).toContain("My merge requests");
  expect(titles(result).at(-1)).toBe("Team / App");
  expect(result.rerun).toBeUndefined();
});

test("a query that matches no project says so", async () => {
  expect((await run("nothing here")).items).toEqual([{ title: "No projects found", subtitle: "nothing here", valid: false }]);
});

test("a project without a list word shows its menu with cached counts", async () => {
  put("gitlab.example.com_1_issues", { data: [entry(1, "Open bug"), entry(2, "Other bug")] });
  const [issues] = (await run("team/app i")).items;
  expect(issues.title).toBe("Issues");
  expect(issues.subtitle).toMatch(/^i · 2 open/);
});

test("a list shows its cached entries and the remembered lookups, the exact number first", async () => {
  put("gitlab.example.com_1_issues", { data: [entry(112, "Open bug"), entry(2, "Other bug")] });
  put("gitlab.example.com_1_issues_lookup", { keys: { 12: { data: [entry(12, "Closed bug")], time: Date.now() } } });
  expect(titles(await run("team/app i bug"))).toEqual(["#112 Open bug", "#2 Other bug", "#12 Closed bug"]);
  const result = await run("team/app i 12");
  expect(titles(result)).toEqual(["#12 Closed bug", "#112 Open bug"]);
  expect(result.rerun).toBeUndefined();
});

test("a cached list error shows next to the last good entries", async () => {
  put("gitlab.example.com_1_issues", { data: [entry(2, "Other bug")], error: "connection refused" });
  expect(titles(await run("team/app i other"))).toEqual(["Could not load from GitLab", "#2 Other bug"]);
});

test("a lookup whose refresh failed shows the error and stops rerunning", async () => {
  put("gitlab.example.com_1_issues", { data: [] });
  put("gitlab.example.com_1_issues_lookup", { error: "Project not found" });
  const result = await run("team/app i 99");
  expect(result.items.map((i) => i.subtitle)).toEqual(["Project not found", "team/app"]);
  expect(result.rerun).toBeUndefined();
  expect(existsSync(`${dir}/gitlab.example.com_1_issues_lookup.json.lock`)).toBe(false);
});

test("code search waits for 3 characters and shows a remembered search", async () => {
  expect(titles(await run("team/app / ab"))).toEqual(["Search the code of team/app"]);
  put("gitlab.example.com_1_code", {
    keys: {
      render: { data: [{ title: "lib/app.js:4", subtitle: "render()", url: `${project.url}/-/blob/main/lib/app.js#L4`, copy: "lib/app.js:4" }], time: Date.now() },
      nothing: { data: [], time: Date.now() },
    },
  });
  expect(titles(await run("team/app / render "))).toEqual(["lib/app.js:4"]);
  expect(titles(await run("team/app / nothing"))).toEqual(['Nothing found for "nothing"']);
});

test("refresh stores a list fetched through the given glab", async () => {
  const glab = { api: async (host, endpoint) => (endpoint.startsWith("projects/1/issues?") ? [issue(3, "New bug")] : []) };
  await refresh("list", ["issues", project.host, "1"], glab);
  expect(read("list").data.map((e) => e.title)).toEqual(["#3 New bug"]);
});

test("refresh remembers a looked-up number, and a 404 as a miss without error", async () => {
  const glab = {
    api: async (host, endpoint) => {
      if (endpoint === "projects/1/issues/5") return issue(5, "Closed bug", "closed");
      throw httpError("404 Not Found (HTTP 404)");
    },
  };
  await refresh("lookup", ["issues", project.host, "1", "5"], glab);
  await refresh("lookup", ["issues", project.host, "1", "6"], glab);
  const { keys } = read("lookup");
  expect(keys[5].data.map((e) => [e.title, e.subtitle])).toEqual([["#5 Closed bug", "closed"]]);
  expect(keys[6]).toMatchObject({ data: [] });
  expect(keys[6].error).toBeUndefined();
});

test("refresh keeps a found number next to a network error", async () => {
  put("lookup-blip", { keys: { 5: { data: [entry(5, "Closed bug")], time: Date.now() - 2 * 60 * 60 * 1000 } } });
  await refresh("lookup-blip", ["issues", project.host, "1", "5"], { api: async () => { throw httpError("connection refused"); } });
  expect(read("lookup-blip").keys[5]).toMatchObject({ data: [entry(5, "Closed bug")], error: "connection refused" });
});

test("refresh runs a code search for the query it was given", async () => {
  const calls = [];
  const glab = {
    api: async (host, endpoint) => {
      calls.push(endpoint);
      return [{ path: "lib/app.js", ref: "main", startline: 3, data: "a\nrender()\n" }];
    },
  };
  await refresh("code", ["code", project.host, "1", "render"], glab);
  expect(calls).toEqual(["projects/1/search?scope=blobs&search=render&per_page=50"]);
  expect(read("code").keys.render.data.map((e) => e.title)).toEqual(["lib/app.js:4"]);
});

test("refresh for a project that is gone keeps the remembered keys", async () => {
  put("gone", { keys: { 5: { data: [entry(5, "Closed bug")], time: Date.now() } } });
  await refresh("gone", ["issues", "gitlab.example.com", "404", "6"], { api: async () => [] });
  expect(read("gone")).toMatchObject({ error: "Project not found", keys: { 5: { data: [entry(5, "Closed bug")] } } });
});
