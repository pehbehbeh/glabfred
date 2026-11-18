// GitLab has no keyboard shortcut for branches
export default {
  id: "branches",
  defaultKey: "branch",
  title: "Branches",
  aliases: "",
  unit: "branches",
  ttl: 10 * 60 * 1000,
  page: () => "/-/branches",
  endpoint: (p) => `projects/${p.id}/repository/branches?per_page=100`,
  paginate: true,
  toEntries: (branches) =>
    branches
      .sort((a, b) => Date.parse(b.commit.committed_date) - Date.parse(a.commit.committed_date))
      .map((b) => ({
        title: b.name,
        subtitle: [b.default && "default", b.protected && "protected", b.commit.author_name].filter(Boolean).join(" · "),
        url: b.web_url,
        copy: b.name,
        haystack: b.name,
        time: b.commit.committed_date,
      })),
};
