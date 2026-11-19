import { encodePath } from "../urls.js";

// The API returns a chunk of the file starting at startline; the hit itself is the first line that contains the query
const hitLine = (blob, query) => {
  const lines = blob.data.split("\n");
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const index = Math.max(0, lines.findIndex((l) => words.some((w) => l.toLowerCase().includes(w))));
  return { line: blob.startline + index, text: lines[index].trim() };
};

// GitLab searches code on the default branch only, and across projects only with advanced search, so this is per project
export default {
  id: "code",
  defaultKey: "/",
  title: "Code search",
  aliases: "code",
  root: true,
  ttl: 10 * 60 * 1000,
  minLength: 3,
  page: (p) => `/search?project_id=${p.id}&scope=blobs`,
  searchEndpoint: (p, query) => `projects/${p.id}/search?scope=blobs&search=${encodeURIComponent(query)}&per_page=50`,
  toEntries: (blobs, p, query) =>
    blobs.map((b) => {
      const { line, text } = hitLine(b, query);
      return {
        title: `${b.path}:${line}`,
        subtitle: text,
        url: `${p.url}/-/blob/${encodePath(b.ref)}/${encodePath(b.path)}#L${line}`,
        copy: `${b.path}:${line}`,
      };
    }),
};
