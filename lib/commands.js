import { errorItems, matches } from "./alfred.js";
import { shortcut } from "./shortcuts.js";
import { instanceUrl } from "./urls.js";

export const commandsKey = () => shortcut("commands", "?");

// Older caches have no host list, so fall back to the hosts that have projects
const hostsOf = (cache) => cache?.hosts ?? [...new Set(cache?.data?.map((p) => p.host))].map((host) => ({ host }));

export function commandItems(cache, query) {
  const projects = cache?.data ?? [];
  const items = [
    {
      title: "Refresh cache",
      subtitle: "Reload projects and lists from GitLab",
      arg: "",
      haystack: "refresh cache reload",
      // action=refresh makes the Conditional in info.plist clear the cache instead of opening a URL
      variables: { action: "refresh" },
    },
  ];
  const hosts = hostsOf(cache);
  for (const { host, error } of hosts) {
    const own = projects.filter((p) => p.host === host);
    const url = own[0] ? instanceUrl(own[0]) : `https://${host}`;
    items.push({
      uid: `host/${host}`,
      title: host,
      subtitle: error ? `Could not load: ${error}` : `${own.length} ${own.length === 1 ? "project" : "projects"} · logged in with glab`,
      arg: url,
      haystack: `host ${host}`,
      text: { copy: url, largetype: host },
      mods: { alt: { arg: host, subtitle: `Copy ${host}` } },
    });
  }
  const found = items.filter((i) => matches(i.haystack, query)).map(({ haystack, ...item }) => item);
  // Without hosts the error says why, e.g. that nobody is logged in
  return hosts.length === 0 ? [...found, ...errorItems(cache?.error)] : found;
}
