// Plain JS on node: APIs only, so it runs on Bun and Node (22+) alike
import { refresh, scriptFilter } from "./lib/app.js";

// Alfred passes the query as the only argument, so a query that is literally "--refresh" can't trigger a refresh
const [, , first, name, ...args] = process.argv;
if (first === "--refresh" && name) await refresh(name, args);
else console.log(await scriptFilter((process.argv[2] ?? "").trimStart()));
