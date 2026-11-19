import { expect, test } from "bun:test";
import { projectKey } from "../lib/projects.js";
import { route } from "../lib/router.js";

const project = (host, path) => ({ host, id: path.length, path, name: path, url: `https://${host}/${path}`, branch: "main" });
const app = project("gitlab.example.com", "team/app");
const appMirror = project("gitlab.com", "team/app");
const api = project("gitlab.example.com", "team/api");
const projects = [app, appMirror, api];

test("searches projects until a known project path is followed by a space", () => {
  expect(route("team/api", projects)).toEqual({ type: "projects", query: "team/api" });
  expect(route("team api", projects)).toEqual({ type: "projects", query: "team api" });
});

test("opens the menu for a project and filters it with the rest", () => {
  expect(route("team/api ", projects)).toEqual({ type: "menu", project: api, prefix: "team/api ", query: "" });
  expect(route("team/api m", projects)).toEqual({ type: "menu", project: api, prefix: "team/api ", query: "m" });
});

test("enters a view by shortcut or alias once a space follows", () => {
  const r = route("team/api m login page", projects);
  expect(r.type).toBe("view");
  expect(r.view.key).toBe("m");
  expect(r.filter).toBe("login page");
  expect(route("team/api mr ", projects).view.key).toBe("m");
  expect(route("team/api t ", projects).view.key).toBe("t");
});

test("a host prefix picks the project when the same path exists on two hosts", () => {
  expect(projectKey(app, projects)).toBe("gitlab.example.com/team/app");
  expect(projectKey(api, projects)).toBe("team/api");
  expect(route("gitlab.com/team/app ", projects).project).toBe(appMirror);
});

test("the commands key opens the commands before anything else", () => {
  expect(route("?", projects)).toEqual({ type: "commands", query: "" });
  expect(route("?host", projects)).toEqual({ type: "commands", query: "host" });
});
