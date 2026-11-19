import { linkItem, matches } from "./alfred.js";
import { shortcut } from "./shortcuts.js";
import { encodePath, instanceUrl } from "./urls.js";
import { VIEWS } from "./views/index.js";

const ref = (p) => encodePath(p.branch);

// Default keys are GitLab's project shortcuts with the "g+" dropped (g+c is c), see docs.gitlab.com/user/shortcuts
export const PAGES = [
  { id: "repository", key: shortcut("repository", "f"), title: "Repository", path: (p) => `/-/tree/${ref(p)}` },
  { id: "web_ide", key: shortcut("web_ide", "."), title: "Web IDE", path: (p) => `/-/ide/project/${p.path}/edit/${ref(p)}`, root: true },
  // No GitLab shortcut for this one
  { id: "settings", key: shortcut("settings", "settings"), title: "Settings", path: () => "/edit" },
];

// action=search makes info.plist open Alfred again with the arg as query, since a modifier can't autocomplete
const createMod = (project, prefix, create) =>
  create.view
    ? { valid: true, arg: `${prefix}${VIEWS.find((v) => v.id === create.view).key} `, subtitle: create.title, variables: { action: "search" } }
    : { valid: true, arg: project.url + create.page(project), subtitle: create.title, variables: { action: "open" } };

const pageUrl = (p, page) => (page.root ? instanceUrl(p) : p.url) + page.path(p);

// counts: view id → number of cached entries, for views that have been loaded before
export function menuItems(project, prefix, query, counts = {}) {
  const entries = [];
  for (const view of VIEWS.filter((v) => !v.hidden)) {
    const url = project.url + view.page(project);
    const count = counts[view.id];
    entries.push({
      key: view.key,
      haystack: `${view.key} ${view.title} ${view.aliases}`,
      item: {
        title: view.title,
        subtitle: [view.key, count !== undefined && `${count} ${view.unit}`, "⌘↩ open in browser"].filter(Boolean).join(" · "),
        valid: false,
        autocomplete: `${prefix}${view.key} `,
        text: { copy: url },
        mods: {
          cmd: { valid: true, arg: url, subtitle: url },
          // ⌥ is wired to the clipboard; the action variable makes the Conditional in info.plist open a URL or search instead
          ...(view.create && { alt: createMod(project, prefix, view.create) }),
        },
      },
    });
  }
  for (const page of PAGES) {
    const url = pageUrl(project, page);
    entries.push({ key: page.key, haystack: `${page.key} ${page.title}`, item: { ...linkItem(page.title, `${page.key} · ${url}`, url), uid: undefined } });
  }
  // An exact shortcut goes first: single letters like "t" or "i" also appear inside many titles
  const q = query.trim();
  const exact = entries.filter((e) => e.key === q);
  const rest = entries.filter((e) => e.key !== q && matches(e.haystack, query));
  return [...exact, ...rest].map((e) => e.item);
}
