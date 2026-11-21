import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";

// cache.js reads the cache dir once at import, and bun shares that import across all test files, so they share one dir
process.env.alfred_workflow_cache = mkdtempSync(`${tmpdir()}/glabfred-test-`);
