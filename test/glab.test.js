import { expect, test } from "bun:test";
import { errorText, parseAuthStatus } from "../lib/glab.js";

test("hosts with a rejected token don't count, unreachable ones do", () => {
  const output = [
    "gitlab.com",
    "  ✓ Logged in to gitlab.com as someone (keyring)",
    "  ✓ API calls for gitlab.com are made over https protocol.",
    "gitlab.example.com",
    "  x gitlab.example.com: API call failed: GET https://gitlab.example.com/api/v4/user: 401 {message: 401 Unauthorized}",
    "gitlab.internal.example",
    '  x gitlab.internal.example: API call failed: Get "https://gitlab.internal.example/api/v4/user": dial tcp: lookup gitlab.internal.example: no such host',
    "  ✓ API calls for gitlab.internal.example are made over https protocol.",
  ].join("\n");
  expect(parseAuthStatus(output)).toEqual(["gitlab.com", "gitlab.internal.example"]);
});

test("a missing glab says so instead of looking like a failed login", () => {
  expect(errorText(Object.assign(new Error("spawn glab ENOENT"), { code: "ENOENT" }))).toMatch(/glab not found/);
});
