// "group/app" from ".../group/app/-/snippets/12"; personal snippets (/-/snippets/12) have none
const projectPath = (url) => new URL(url).pathname.split("/-/")[0].slice(1);

// project: when set, the snippet is referenced within it ($12), otherwise with its project path (group/app$12)
export const snippetEntry = (s, project) => {
  const path = s.project_id ? projectPath(s.web_url) : "";
  const files = s.files?.map((f) => f.path) ?? [s.file_name];
  return {
    title: s.title,
    subtitle: [`$${s.id}`, !project && path, files.join(", "), s.author?.username, s.visibility].filter(Boolean).join(" · "),
    url: s.web_url,
    copy: project || !path ? `$${s.id}` : `${path}$${s.id}`,
    haystack: `$${s.id} ${s.title} ${s.description ?? ""} ${files.join(" ")} ${path} ${s.author?.username}`,
    time: s.updated_at,
  };
};

export default {
  id: "snippets",
  defaultKey: "s",
  title: "Snippets",
  aliases: "snippet",
  unit: "snippets",
  ttl: 10 * 60 * 1000,
  page: () => "/-/snippets",
  create: { title: "New snippet", page: () => "/-/snippets/new" },
  endpoint: (p) => `projects/${p.id}/snippets?per_page=100`,
  paginate: true,
  toEntries: (snippets, p) => snippets.map((s) => snippetEntry(s, p)),
};
