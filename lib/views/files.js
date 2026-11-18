import { encodePath } from "../urls.js";

const ref = (p) => encodeURIComponent(p.branch);

export default {
  id: "files",
  defaultKey: "t",
  title: "Find file",
  aliases: "file files find",
  unit: "files",
  ttl: 60 * 60 * 1000,
  page: (p) => `/-/find_file/${encodePath(p.branch)}`,
  endpoint: (p) => `projects/${p.id}/repository/tree?recursive=true&per_page=100&ref=${ref(p)}`,
  paginate: true,
  toEntries: (tree, p) =>
    tree
      .filter((f) => f.type === "blob")
      .sort((a, b) => a.path.length - b.path.length)
      .map((f) => ({
        title: f.name,
        subtitle: f.path,
        url: `${p.url}/-/blob/${encodePath(p.branch)}/${encodePath(f.path)}`,
        copy: f.path,
        haystack: f.path,
      })),
};
