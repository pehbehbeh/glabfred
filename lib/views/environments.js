export default {
  id: "environments",
  defaultKey: "e",
  title: "Environments",
  aliases: "env",
  unit: "available",
  ttl: 10 * 60 * 1000,
  page: () => "/-/environments",
  endpoint: (p) => `projects/${p.id}/environments?states=available&per_page=100`,
  paginate: true,
  toEntries: (environments, p) =>
    environments
      .sort((a, b) => Date.parse(b.updated_at) - Date.parse(a.updated_at))
      .map((e) => {
        // The list response has no web URL for the environment page
        const page = `${p.url}/-/environments/${e.id}`;
        return {
          title: e.name,
          subtitle: [e.tier, e.external_url].filter(Boolean).join(" · "),
          // ↩ opens the deployed app, ⌘↩ the environment in GitLab
          url: e.external_url || page,
          cmdUrl: e.external_url ? page : undefined,
          copy: e.external_url || e.name,
          haystack: `${e.name} ${e.tier ?? ""} ${e.external_url ?? ""}`,
          time: e.updated_at,
        };
      }),
};
