// i opens this list instead of GitLab's new issue page, which is ⌥↩ on the Issues entry in the menu
export default {
  id: "issues",
  defaultKey: "i",
  title: "Issues",
  aliases: "issue",
  unit: "open",
  ttl: 60 * 1000,
  page: () => "/-/issues",
  create: { title: "New issue", page: () => "/-/issues/new" },
  endpoint: (p) => `projects/${p.id}/issues?state=opened&per_page=100`,
  paginate: true,
  toEntries: (issues) =>
    issues.map((i) => {
      const people = i.assignees?.map((a) => a.username) ?? [];
      return {
        title: `#${i.iid} ${i.title}`,
        subtitle: [...people, ...i.labels].join(" · "),
        url: i.web_url,
        copy: `#${i.iid}`,
        haystack: `#${i.iid} ${i.title} ${people.join(" ")} ${i.labels.join(" ")}`,
        time: i.updated_at,
      };
    }),
};
