export default {
  id: "boards",
  defaultKey: "b",
  title: "Issue boards",
  aliases: "board",
  unit: "boards",
  ttl: 10 * 60 * 1000,
  page: () => "/-/boards",
  endpoint: (p) => `projects/${p.id}/boards?per_page=100`,
  paginate: true,
  toEntries: (boards, p) =>
    boards.map((b) => {
      const columns = b.lists.map((l) => l.label?.name).filter(Boolean);
      return {
        title: b.name,
        subtitle: columns.join(" · "),
        // The boards API returns no web URL
        url: `${p.url}/-/boards/${b.id}`,
        copy: b.name,
        haystack: `${b.name} ${columns.join(" ")}`,
      };
    }),
};
