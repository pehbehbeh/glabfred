import { encodePath } from "../urls.js";

export default {
  id: "wiki",
  defaultKey: "w",
  title: "Wiki",
  aliases: "",
  unit: "pages",
  ttl: 10 * 60 * 1000,
  page: () => "/-/wikis/home",
  endpoint: (p) => `projects/${p.id}/wikis`,
  toEntries: (pages, p) =>
    pages
      .sort((a, b) => a.slug.localeCompare(b.slug))
      .map((w) => ({
        // The title is only the last part of a nested page, the slug keeps its folder
        title: w.title,
        subtitle: w.slug,
        // Slugs come back unencoded (FAQ-&-Tipps-für-Einsteiger)
        url: `${p.url}/-/wikis/${encodePath(w.slug)}`,
        copy: w.slug,
        haystack: `${w.title} ${w.slug}`,
      })),
};
