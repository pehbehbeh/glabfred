// Not in the project menu: ⌥↩ on Merge requests opens it. It shows the branches cache, refreshed after 15 seconds
// instead of 10 minutes, so a branch pushed a moment ago shows up
export default {
  id: "new_merge_request",
  defaultKey: "new",
  title: "Branches",
  aliases: "",
  hidden: true,
  cacheView: "branches",
  ttl: 15 * 1000,
  fromCache: (entries, p) =>
    entries
      .filter((e) => !e.default)
      .map((e) => ({ ...e, url: `${p.url}/-/merge_requests/new?merge_request[source_branch]=${encodeURIComponent(e.title)}` })),
};
