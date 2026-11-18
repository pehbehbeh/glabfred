import { expect, test } from "bun:test";
import { fetchProjects } from "../lib/projects.js";

const gitlabProject = (id, path, activity) => ({ id, name_with_namespace: path, path_with_namespace: path, web_url: `https://x/${path}`, default_branch: "main", last_activity_at: activity });

test("a failing host keeps its last known projects and reports the error", async () => {
  const glab = {
    loggedInHosts: async () => ["up.example.com", "down.example.com"],
    api: async (host) => {
      if (host === "down.example.com") throw Object.assign(new Error("exit 1"), { stderr: "connection refused\n" });
      return [gitlabProject(1, "team/new", "2026-02-01T00:00:00Z")];
    },
  };
  const previous = { data: [{ host: "down.example.com", id: 9, path: "team/old", activity: "2026-01-01T00:00:00Z" }] };
  const { data, error } = await fetchProjects(glab, previous);
  expect(data.map((p) => `${p.host}/${p.path}`)).toEqual(["up.example.com/team/new", "down.example.com/team/old"]);
  expect(error).toBe("down.example.com: connection refused");
});

test("no logged-in host tells the user to run glab auth login", async () => {
  const { data, error } = await fetchProjects({ loggedInHosts: async () => [], api: async () => [] });
  expect(data).toEqual([]);
  expect(error).toMatch(/glab auth login/);
});
