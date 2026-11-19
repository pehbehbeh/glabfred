export default {
  id: "merge_requests",
  defaultKey: "m",
  title: "Merge requests",
  aliases: "mr",
  unit: "open",
  ttl: 60 * 1000,
  page: () => "/-/merge_requests",
  create: { title: "New merge request from a branch", view: "new_merge_request" },
  endpoint: (p) => `projects/${p.id}/merge_requests?state=opened&per_page=100`,
  paginate: true,
  byNumber: (p, n) => `projects/${p.id}/merge_requests/${n}`,
  toEntries: (mrs) =>
    mrs.map((m) => ({
      title: `!${m.iid} ${m.title}`,
      iid: m.iid,
      subtitle: [m.state !== "opened" && m.state, m.author?.username, m.draft && "draft", `${m.source_branch} → ${m.target_branch}`].filter(Boolean).join(" · "),
      url: m.web_url,
      copy: `!${m.iid}`,
      haystack: `!${m.iid} ${m.title} ${m.author?.username} ${m.source_branch}`,
      time: m.updated_at,
    })),
};
