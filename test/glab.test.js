import { expect, test } from "bun:test";
import { errorText, parseAuthStatus } from "../lib/glab.js";

test("only hosts with a successful login count", () => {
  const output = [
    "gitlab.com",
    "  ✓ Logged in to gitlab.com as someone (keyring)",
    "  ✓ API calls for gitlab.com are made over https protocol.",
    "gitlab.example.com",
    "  x gitlab.example.com: API call failed: 401 Unauthorized",
    "gitlab.internal.example",
    "  ✓ Logged in to gitlab.internal.example as someone (config.yml)",
  ].join("\n");
  expect(parseAuthStatus(output)).toEqual(["gitlab.com", "gitlab.internal.example"]);
});

test("a missing glab says so instead of looking like a failed login", () => {
  expect(errorText(Object.assign(new Error("spawn glab ENOENT"), { code: "ENOENT" }))).toMatch(/glab not found/);
});
