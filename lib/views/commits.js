import { encodePath } from "../urls.js";

// Only the latest 100 on the default branch: a full history can be tens of thousands of commits
export default {
  id: "commits",
  defaultKey: "c",
  title: "Commits",
  aliases: "commit",
  unit: "recent",
  ttl: 60 * 1000,
  page: (p) => `/-/commits/${encodePath(p.branch)}`,
  endpoint: (p) => `projects/${p.id}/repository/commits?ref_name=${encodeURIComponent(p.branch)}&per_page=100`,
  toEntries: (commits) =>
    commits.map((c) => ({
      title: c.title,
      subtitle: `${c.short_id} · ${c.author_name}`,
      url: c.web_url,
      copy: c.short_id,
      haystack: `${c.short_id} ${c.title} ${c.author_name}`,
      time: c.committed_date,
    })),
};
