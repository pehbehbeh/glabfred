import { ago, errorItems, exactNumberFirst, linkItem, loadingItem, numberQuery, output, search } from "./alfred.js";
import { cached, cachedKey, readCache, refreshKey, remembered, writeRefresh } from "./cache.js";
import { commandItems } from "./commands.js";
import * as glab from "./glab.js";
import { menuItems } from "./menu.js";
import { fetchMine, MINE, mineItems } from "./mine.js";
import { fetchProjects, projectItems } from "./projects.js";
import { route } from "./router.js";
import { fetchView, VIEWS } from "./views/index.js";

const PROJECTS_TTL = 60 * 60 * 1000;
const MINE_TTL = 60 * 1000;
// Closed issues and merged MRs rarely change, so a looked-up number is refreshed only after an hour.
// A found entry that wasn't looked up again for 30 days is dropped
const LOOKUP = { ttl: 60 * 60 * 1000, keep: 30 * 24 * 60 * 60 * 1000 };
const MAX_ITEMS = 200;

const viewCacheName = (project, view) => `${project.host}_${project.id}_${view.id}`;
const viewArgs = (project, view) => [view.id, project.host, String(project.id)];

// key is the looked-up number or the code search query, added by cachedKey
export async function refresh(name, [viewId, host, id, key] = []) {
  await writeRefresh(name, async () => {
    const previous = await readCache(name);
    try {
      if (name === "projects") return await fetchProjects(glab, previous);
      if (!host) {
        const view = MINE.find((v) => v.id === viewId);
        return view ? await fetchMine(glab, view, previous) : { error: `Unknown list ${viewId}` };
      }
      const project = (await readCache("projects"))?.data?.find((p) => p.host === host && String(p.id) === id);
      // Lookup and code caches keep their remembered entries
      if (!project) return { ...previous, data: previous?.data, error: "Project not found" };
      const view = VIEWS.find((v) => v.id === viewId);
      if (view.searchEndpoint) return await refreshKey(previous, key, { ttl: view.ttl }, () => searchCode(view, project, key));
      if (key) return await refreshKey(previous, key, LOOKUP, () => lookupNumber(view, project, key));
      return { data: await fetchView(view, project, glab.api) };
    } catch (error) {
      // Keep the last good data next to the error, so a network blip doesn't empty the list
      return { ...previous, data: previous?.data, error: glab.errorText(error) };
    }
  });
}

async function lookupNumber(view, project, number) {
  try {
    return view.toEntries([await glab.api(project.host, view.byNumber(project, number))], project);
  } catch (error) {
    // A number that doesn't exist is no error, it just has no entry
    if (/\(HTTP 404\)/.test(glab.errorText(error))) return [];
    throw error;
  }
}

const searchCode = async (view, project, query) =>
  view.toEntries(await glab.api(project.host, view.searchEndpoint(project, query)), project, query);

// One file per project holds the searches of the last ttl
async function codeItems(project, view, filter) {
  const query = filter.trim();
  if (query.length < view.minLength) return { items: [{ title: `Search the code of ${project.path}`, subtitle: `Type at least ${view.minLength} characters`, valid: false }] };
  const { entry, failed, loading } = await cachedKey(viewCacheName(project, view), query, { ttl: view.ttl }, viewArgs(project, view));
  const items = [];
  if (loading) items.push(loadingItem(`code search for "${query}"`));
  items.push(...errorItems(entry?.error ?? failed));
  if (entry && entry.data.length === 0 && !entry.error) items.push({ title: `Nothing found for "${query}"`, subtitle: "GitLab searches the default branch only", valid: false });
  items.push(...entryItems(entry?.data ?? []));
  return { items, rerun: loading };
}

async function viewItems(project, view, filter) {
  if (view.searchEndpoint) return codeItems(project, view, filter);
  if (view.entries) return { items: entryItems(search(view.entries(project), filter)) };
  // A view with cacheView shows another view's cache, with its own ttl
  const source = VIEWS.find((v) => v.id === view.cacheView) ?? view;
  const { cache: stored, loading } = await cached(viewCacheName(project, source), view.ttl, viewArgs(project, source));
  const cache = stored?.data && view.fromCache ? { ...stored, data: view.fromCache(stored.data, project) } : stored;
  const items = [];
  if (loading && !cache) items.push(loadingItem(view.title.toLowerCase()));
  items.push(...errorItems(cache?.error));
  // The cached list only holds open ones, so a number not in it is looked up on its own to find closed and merged ones too.
  // One file per list holds the looked-up numbers, and the text search finds them as well
  const open = cache?.data ?? [];
  const lookupName = `${viewCacheName(project, view)}_lookup`;
  const openIids = new Set(open.map((e) => e.iid));
  const found = view.byNumber ? (await remembered(lookupName)).filter((e) => !openIids.has(e.iid)) : [];
  let entries = search([...open, ...found], filter);
  let lookupLoading = false;
  const number = view.byNumber && numberQuery(filter);
  if (number && cache?.data && !openIids.has(Number(number))) {
    const lookup = await cachedKey(lookupName, number, LOOKUP, viewArgs(project, view));
    lookupLoading = lookup.loading;
    if (lookupLoading) items.push(loadingItem(`${view.title.toLowerCase().replace(/s$/, "")} ${number}`));
    items.push(...errorItems(lookup.entry?.error ?? lookup.failed));
  }
  if (number) entries = exactNumberFirst(entries, number);
  entries = entries.slice(0, MAX_ITEMS);
  if (cache?.data && entries.length === 0 && !lookupLoading) items.push({ title: `No ${view.title.toLowerCase()} found`, subtitle: project.path, valid: false });
  items.push(...entryItems(entries));
  return { items, rerun: loading || lookupLoading };
}

const entryItems = (entries) =>
  entries.map((e) => {
    const subtitle = [e.subtitle, e.time && ago(e.time)].filter(Boolean).join(" · ");
    const item = linkItem(e.title, subtitle, e.url, e.copy);
    if (e.cmdUrl) item.mods.cmd = { valid: true, arg: e.cmdUrl, subtitle: e.cmdUrl };
    return item;
  });

async function mineViewItems(view, filter) {
  const { cache, loading } = await cached(`mine_${view.id}`, MINE_TTL, [view.id]);
  const items = [];
  if (loading && !cache) items.push(loadingItem(view.title.toLowerCase()));
  items.push(...errorItems(cache?.error));
  const entries = search(cache?.data ?? [], filter).slice(0, MAX_ITEMS);
  if (cache?.data && entries.length === 0) items.push({ title: `No ${view.title.toLowerCase()} found`, valid: false });
  items.push(...entryItems(entries));
  return { items, rerun: loading };
}

async function cachedCounts(project) {
  const counts = {};
  for (const view of VIEWS.filter((v) => !v.hidden)) {
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
  if (r.type === "commands") {
    result = { items: commandItems(cache, r.query) };
  } else if (r.type === "mine") {
    result = await mineViewItems(r.view, r.filter);
  } else if (r.type === "view") {
    result = await viewItems(r.project, r.view, r.filter);
  } else if (r.type === "menu") {
    result = { items: menuItems(r.project, r.prefix, r.query, await cachedCounts(r.project)) };
  } else {
    const items = [...mineItems(r.query), ...errorItems(cache?.error), ...projectItems(projects, r.query)];
    if (loading && !cache) items.unshift(loadingItem("projects"));
    result = { items };
  }
  return output({ items: result.items, rerun: loading || result.rerun });
}
