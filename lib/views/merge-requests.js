export default {
  id: "merge_requests",
  defaultKey: "m",
  title: "Merge requests",
  aliases: "mr",
  unit: "open",
  ttl: 60 * 1000,
  page: () => "/-/merge_requests",
  create: { title: "New merge request", page: () => "/-/merge_requests/new" },
  endpoint: (p) => `projects/${p.id}/merge_requests?state=opened&per_page=100`,
  paginate: true,
  toEntries: (mrs) =>
    mrs.map((m) => ({
      title: `!${m.iid} ${m.title}`,
      subtitle: [m.author?.username, m.draft && "draft", `${m.source_branch} → ${m.target_branch}`].filter(Boolean).join(" · "),
      url: m.web_url,
      copy: `!${m.iid}`,
      haystack: `!${m.iid} ${m.title} ${m.author?.username} ${m.source_branch}`,
      time: m.updated_at,
    })),
};
