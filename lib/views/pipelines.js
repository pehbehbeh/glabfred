const icon = {
  success: "✅", failed: "❌", running: "🔄", pending: "⏳", created: "⏳",
  manual: "⏸", scheduled: "⏰", canceled: "⊘", skipped: "⊘",
};

export default {
  id: "pipelines",
  defaultKey: "p",
  title: "Pipelines",
  aliases: "pipe pipelines ci",
  unit: "recent",
  ttl: 60 * 1000,
  page: () => "/-/pipelines",
  endpoint: (p) => `projects/${p.id}/pipelines?per_page=50`,
  toEntries: (pipelines) =>
    pipelines.map((pl) => ({
      title: `${icon[pl.status] ?? "•"} ${pl.ref}`,
      subtitle: `#${pl.id} · ${pl.status} · ${pl.source}`,
      url: pl.web_url,
      copy: pl.web_url,
      haystack: `${pl.ref} ${pl.status} ${pl.id}`,
      time: pl.updated_at,
    })),
};
