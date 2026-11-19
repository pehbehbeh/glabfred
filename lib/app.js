import { ago, errorItems, exactNumberFirst, linkItem, loadingItem, numberQuery, output, search } from "./alfred.js";
import { cached, readCache, writeRefresh } from "./cache.js";
import * as glab from "./glab.js";
import { menuItems } from "./menu.js";
import { fetchProjects, projectItems } from "./projects.js";
import { route } from "./router.js";
import { fetchView, VIEWS } from "./views/index.js";

const PROJECTS_TTL = 60 * 60 * 1000;
const MAX_ITEMS = 200;

const viewCacheName = (project, view) => `${project.host}_${project.id}_${view.id}`;

export async function refresh(name, [viewId, host, id, number] = []) {
  await writeRefresh(name, async () => {
    const previous = await readCache(name);
    try {
      if (name === "projects") return await fetchProjects(glab, previous);
      const project = (await readCache("projects"))?.data?.find((p) => p.host === host && String(p.id) === id);
      if (!project) return { error: "Project not found" };
      const view = VIEWS.find((v) => v.id === viewId);
      if (number) return { data: view.toEntries([await glab.api(project.host, view.byNumber(project, number))], project) };
      return { data: await fetchView(view, project, glab.api) };
    } catch (error) {
      // A number that doesn't exist is no error, the list just stays empty
      if (number && /\b404\b/.test(glab.errorText(error))) return { data: [] };
      // Keep the last good data next to the error, so a network blip doesn't empty the list
      return { data: previous?.data, error: glab.errorText(error) };
    }
  });
}

async function viewItems(project, view, filter) {
  const { cache, loading } = await cached(viewCacheName(project, view), view.ttl, [view.id, project.host, String(project.id)]);
  const items = [];
  if (loading && !cache) items.push(loadingItem(view.title.toLowerCase()));
  items.push(...errorItems(cache?.error));
  let entries = search(cache?.data ?? [], filter);
  let lookupLoading = false;
  const number = view.byNumber && numberQuery(filter);
  // The cached list only holds open ones, so a number not in it is looked up on its own to find closed and merged ones too
  if (number && cache?.data && !entries.some((e) => String(e.iid) === number)) {
    const lookup = await cached(`${viewCacheName(project, view)}_${number}`, view.ttl, [view.id, project.host, String(project.id), number]);
    lookupLoading = lookup.loading;
    items.push(...errorItems(lookup.cache?.error));
    entries.unshift(...(lookup.cache?.data ?? []));
  }
  if (number) entries = exactNumberFirst(entries, number);
  entries = entries.slice(0, MAX_ITEMS);
  if (cache?.data && entries.length === 0 && !lookupLoading) items.push({ title: `No ${view.title.toLowerCase()} found`, subtitle: project.path, valid: false });
  for (const e of entries) {
    const subtitle = [e.subtitle, e.time && ago(e.time)].filter(Boolean).join(" · ");
    const item = linkItem(e.title, subtitle, e.url, e.copy);
    if (e.cmdUrl) item.mods.cmd = { valid: true, arg: e.cmdUrl, subtitle: e.cmdUrl };
    items.push(item);
  }
  return { items, rerun: loading || lookupLoading };
}

async function cachedCounts(project) {
  const counts = {};
  for (const view of VIEWS) {
    const length = (await readCache(viewCacheName(project, view)))?.data?.length;
    if (length !== undefined) counts[view.id] = length;
  }
  return counts;
}

export async function scriptFilter(query) {
  const { cache, loading } = await cached("projects", PROJECTS_TTL, []);
  const projects = cache?.data ?? [];
  const r = route(query, projects);

  let result;
  if (r.type === "view") {
    result = await viewItems(r.project, r.view, r.filter);
  } else if (r.type === "menu") {
    result = { items: menuItems(r.project, r.prefix, r.query, await cachedCounts(r.project)) };
  } else {
    const items = [...errorItems(cache?.error), ...projectItems(projects, r.query)];
    if (loading && !cache) items.unshift(loadingItem("projects"));
    result = { items };
  }
  return output({ items: result.items, rerun: loading || result.rerun });
}
