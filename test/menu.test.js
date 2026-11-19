import { expect, test } from "bun:test";
import { menuItems } from "../lib/menu.js";

const project = { host: "gitlab.example.com", id: 1, path: "team/app", url: "https://gitlab.example.com/team/app", branch: "main" };

test("an exact shortcut comes first even when other titles contain the letter", () => {
  const items = menuItems(project, "team/app ", "t");
  expect(items[0].title).toBe("Find file");
  expect(items.length).toBeGreaterThan(1);
  expect(menuItems(project, "team/app ", "i")[0].title).toBe("Issues");
});

test("views autocomplete into the list, pages link directly", () => {
  const [mrs] = menuItems(project, "team/app ", "m");
  expect(mrs.autocomplete).toBe("team/app m ");
  expect(mrs.valid).toBe(false);
  const [repository] = menuItems(project, "team/app ", "f");
  expect(repository.arg).toBe("https://gitlab.example.com/team/app/-/tree/main");
});

test("the Web IDE link starts at the host, not the project", () => {
  const [ide] = menuItems(project, "team/app ", ".");
  expect(ide.arg).toBe("https://gitlab.example.com/-/ide/project/team/app/edit/main");
});

test("cached counts show up in the subtitle", () => {
  const [mrs] = menuItems(project, "team/app ", "m", { merge_requests: 3 });
  expect(mrs.subtitle).toMatch(/3 open/);
});

test("⌥ on merge requests opens the branch picker, on issues the create page", () => {
  const [mrs] = menuItems(project, "team/app ", "m");
  expect(mrs.mods.alt).toEqual({ valid: true, arg: "team/app new ", subtitle: "New merge request from a branch", variables: { action: "search" } });
  const [issues] = menuItems(project, "team/app ", "i");
  expect(issues.mods.alt.arg).toBe("https://gitlab.example.com/team/app/-/issues/new");
  const [files] = menuItems(project, "team/app ", "t");
  expect(files.mods.alt).toBe(undefined);
});

test("the Web IDE link keeps a relative URL root", () => {
  const sub = { ...project, url: "https://example.com/gitlab/team/app" };
  const [ide] = menuItems(sub, "team/app ", ".");
  expect(ide.arg).toBe("https://example.com/gitlab/-/ide/project/team/app/edit/main");
});

test("the branch picker is not in the menu", () => {
  expect(menuItems(project, "team/app ", "").some((i) => i.autocomplete === "team/app new ")).toBe(false);
});
