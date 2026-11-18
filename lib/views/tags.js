import { encodePath } from "../urls.js";

// GitLab has no keyboard shortcut for tags
export default {
  id: "tags",
  defaultKey: "tag",
  title: "Tags",
  aliases: "tags",
  unit: "tags",
  ttl: 10 * 60 * 1000,
  page: () => "/-/tags",
  endpoint: (p) => `projects/${p.id}/repository/tags?per_page=100`,
  paginate: true,
  toEntries: (tags, p) =>
    tags
      .sort((a, b) => Date.parse(b.commit.committed_date) - Date.parse(a.commit.committed_date))
      .map((t) => ({
        title: t.name,
        subtitle: [t.release && "release", t.commit.title].filter(Boolean).join(" · "),
        url: `${p.url}/-/tags/${encodePath(t.name)}`,
        copy: t.name,
        haystack: `${t.name} ${t.message ?? ""} ${t.commit.title}`,
        time: t.commit.committed_date,
      })),
};
