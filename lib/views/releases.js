export default {
  id: "releases",
  defaultKey: "r",
  title: "Releases",
  aliases: "release",
  unit: "releases",
  ttl: 10 * 60 * 1000,
  page: () => "/-/releases",
  endpoint: (p) => `projects/${p.id}/releases?per_page=100`,
  paginate: true,
  toEntries: (releases) =>
    releases.map((r) => ({
      title: r.name || r.tag_name,
      subtitle: [r.name && r.name !== r.tag_name && r.tag_name, r.author?.username].filter(Boolean).join(" · "),
      url: r._links.self,
      copy: r.tag_name,
      haystack: `${r.name ?? ""} ${r.tag_name} ${r.description ?? ""}`,
      time: r.released_at,
    })),
};
