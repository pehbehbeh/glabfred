import { shortcut } from "../shortcuts.js";
import branches from "./branches.js";
import files from "./files.js";
import issues from "./issues.js";
import mergeRequests from "./merge-requests.js";
import pipelines from "./pipelines.js";

// A list key with a space never routes (the space ends the key), and two lists on one key would both open the first.
// Such a configured key falls back to the default; repeat until no clash is left, since a fallback can free a key
export function assignKeys(views, configured) {
  for (const view of views) {
    const key = configured(view.id);
    view.key = key && !/\s/.test(key) ? key : view.defaultKey;
  }
  const taken = (view) => views.some((o) => o !== view && (o.key === view.key || o.aliases.split(" ").includes(view.key)));
  let changed = true;
  while (changed) {
    changed = false;
    for (const view of views) {
      if (view.key !== view.defaultKey && taken(view)) {
        view.key = view.defaultKey;
        changed = true;
      }
    }
  }
  return views;
}

// Order is the order in the project menu
export const VIEWS = assignKeys([mergeRequests, issues, files, pipelines, branches], (id) => shortcut(id));

export const findView = (word) => VIEWS.find((v) => v.key === word || v.aliases.split(" ").includes(word));

export const fetchView = async (view, project, api) =>
  view.toEntries(await api(project.host, view.endpoint(project), { paginate: view.paginate }), project);
