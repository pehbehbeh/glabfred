// Plain JS on node: APIs only, so it runs on Bun and Node (22+) alike
import { refresh, scriptFilter } from "./lib/app.js";
import { clearCache } from "./lib/cache.js";

// Alfred passes the query as the only argument, so a query that is literally "--refresh" or "--cache" triggers nothing
const [, , first, name, ...args] = process.argv;
if (first === "--refresh" && name) await refresh(name, args);
else if (first === "--cache" && name === "clear") clearCache();
else console.log(await scriptFilter((process.argv[2] ?? "").trimStart()));
