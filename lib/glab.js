import { execFile } from "node:child_process";
import { promisify } from "node:util";

const run = promisify(execFile);
// A hanging host would otherwise hold the refresh until the lock times out
const TIMEOUT = 2 * 60 * 1000;

export const errorText = (error) => {
  if (error?.code === "ENOENT") return "glab not found. Install it and run `glab auth login`.";
  if (error?.killed) return "glab timed out";
  return String(error?.stderr || error?.message || error).trim();
};

export async function api(host, endpoint, { paginate = false } = {}) {
  const flags = paginate ? ["--paginate", "--output", "ndjson"] : [];
  const { stdout } = await run("glab", ["api", "--hostname", host, endpoint, ...flags], { maxBuffer: 512 * 1024 * 1024, timeout: TIMEOUT });
  return paginate ? stdout.split("\n").filter(Boolean).map((line) => JSON.parse(line)) : JSON.parse(stdout);
}

export function parseAuthStatus(output) {
  const hosts = new Set();
  let current;
  for (const line of output.split("\n")) {
    if (/^\S/.test(line)) current = line.trim();
    else if (current && line.includes("✓ Logged in to")) hosts.add(current);
  }
  return [...hosts];
}

export async function loggedInHosts() {
  try {
    const { stdout, stderr } = await run("glab", ["auth", "status"], { timeout: TIMEOUT });
    return parseAuthStatus(stdout + stderr);
  } catch (error) {
    if (error.code === "ENOENT" || error.killed) throw error;
    // glab exits non-zero as soon as one host has a problem; the others are still listed
    return parseAuthStatus(`${error.stdout ?? ""}${error.stderr ?? ""}`);
  }
}
