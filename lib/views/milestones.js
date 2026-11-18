// GitLab has no project keyboard shortcut for milestones
export default {
  id: "milestones",
  defaultKey: "milestone",
  title: "Milestones",
  aliases: "",
  unit: "active",
  ttl: 10 * 60 * 1000,
  page: () => "/-/milestones",
  endpoint: (p) => `projects/${p.id}/milestones?state=active&include_ancestors=true&per_page=100`,
  paginate: true,
  toEntries: (milestones) =>
    milestones
      // Next due date first, milestones without one last
      .sort((a, b) => (a.due_date ?? "9999").localeCompare(b.due_date ?? "9999"))
      .map((m) => ({
        title: m.title,
        subtitle: [m.group_id && "group", m.due_date && `due ${m.due_date}`, m.expired && "overdue"].filter(Boolean).join(" · "),
        url: m.web_url,
        // GitLab's reference syntax: %name, or %"name" when it contains a space
        copy: m.title.includes(" ") ? `%"${m.title}"` : `%${m.title}`,
        haystack: `${m.title} ${m.description ?? ""}`,
      })),
};
