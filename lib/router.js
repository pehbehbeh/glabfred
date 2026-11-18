import { findProject } from "./projects.js";
import { findView } from "./views/index.js";

// "<project> <view> <filter>": a project or view only counts once a space follows it,
// so the menu can still be filtered while the word is being typed
export function route(query, projects) {
  const [, first, rest] = query.match(/^(\S+) (.*)$/s) ?? [];
  const project = first && findProject(projects, first);
  if (!project) return { type: "projects", query };

  const [, word, filter] = rest.match(/^(\S+) (.*)$/s) ?? [];
  const view = word && findView(word);
  if (view) return { type: "view", project, view, filter };
  return { type: "menu", project, prefix: `${first} `, query: rest };
}
