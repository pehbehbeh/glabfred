import { commandsKey } from "./commands.js";
import { findMine } from "./mine.js";
import { findProject } from "./projects.js";
import { findView } from "./views/index.js";

// "<project> <view> <filter>": a project or view only counts once a space follows it,
// so the menu can still be filtered while the word is being typed
export function route(query, projects) {
  const key = commandsKey();
  if (query.startsWith(key)) return { type: "commands", query: query.slice(key.length) };
  const [, first, rest] = query.match(/^(\S+) (.*)$/s) ?? [];
  // Opens without a trailing space, unlike project lists. Case-sensitive, so the default keys M, I and R leave a project search for "m" alone
  if (findMine(query)) return { type: "mine", view: findMine(query), filter: "" };
  const mine = first && findMine(first);
  if (mine) return { type: "mine", view: mine, filter: rest };
  const project = first && findProject(projects, first);
  if (!project) return { type: "projects", query };

  const [, word, filter] = rest.match(/^(\S+) (.*)$/s) ?? [];
  const view = word && findView(word);
  if (view) return { type: "view", project, view, filter };
  return { type: "menu", project, prefix: `${first} `, query: rest };
}
