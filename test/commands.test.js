import { expect, test } from "bun:test";
import { commandItems } from "../lib/commands.js";

const cache = {
  data: [{ host: "gitlab.example.com", path: "team/app", url: "https://gitlab.example.com/team/app" }],
  hosts: [{ host: "gitlab.example.com" }, { host: "down.example.com", error: "connection refused" }],
};

test("lists refresh and each host with its project count or error", () => {
  const [refresh, up, down] = commandItems(cache, "");
  expect(refresh.variables).toEqual({ action: "refresh" });
  expect(up.subtitle).toBe("1 project · logged in with glab");
  expect(up.arg).toBe("https://gitlab.example.com");
  expect(down.subtitle).toBe("Could not load: connection refused");
  expect(down.arg).toBe("https://down.example.com");
  expect(commandItems(cache, "down").map((i) => i.title)).toEqual(["down.example.com"]);
});

test("without hosts the cached error explains why", () => {
  const items = commandItems({ data: [], hosts: [], error: "No GitLab host logged in. Run `glab auth login`." }, "");
  expect(items.map((i) => i.title)).toEqual(["Refresh cache", "Could not load from GitLab"]);
});
