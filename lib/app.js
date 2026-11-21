import { exactNumberFirst, listItems, numberQuery, output, search } from "./alfred.js";
import { cached, cachedKey, readCache, refreshKey, remembered, writeRefresh } from "./cache.js";
import { commandItems } from "./commands.js";
import * as cli from "./glab.js";
import { errorText } from "./glab.js";
import { menuItems } from "./menu.js";
import { fetchMine, MINE, mineItems } from "./mine.js";
import { fetchProjects, matchProjects, projectItems } from "./projects.js";
import { route } from "./router.js";
import { fetchView, VIEWS } from "./views/index.js";

const PROJECTS_TTL = 60 * 60 * 1000;
const MINE_TTL = 60 * 1000;
// Closed issues and merged MRs rarely change, so a looked-up number is refreshed only after an hour.
// A found entry that wasn't looked up again for 30 days is dropped
const LOOKUP = { ttl: 60 * 60 * 1000, keep: 30 * 24 * 60 * 60 * 1000 };

const viewCacheName = (project, view) => `${project.host}_${project.id}_${view.id}`;
const viewArgs = (project, view) => [view.id, project.host, String(project.id)];

// key is the looked-up number or the code search query, added by cachedKey
export async function refresh(name, [viewId, host, id, key] = [], glab = cli) {
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
      if (view.searchEndpoint) return await refreshKey(previous, key, { ttl: view.ttl }, () => searchCode(glab, view, project, key));
      if (key) return await refreshKey(previous, key, LOOKUP, () => lookupNumber(glab, view, project, key));
      return { data: await fetchView(view, project, glab.api) };
    } catch (error) {
      // Keep the last good data next to the error, so a network blip doesn't empty the list
      return { ...previous, data: previous?.data, error: errorText(error) };
    }
  });
}

async function lookupNumber(glab, view, project, number) {
  try {
    return view.toEntries([await glab.api(project.host, view.byNumber(project, number))], project);
  } catch (error) {
    // A number that doesn't exist is no error, it just has no entry
    if (/\(HTTP 404\)/.test(errorText(error))) return [];
    throw error;
  }
}

const searchCode = async (glab, view, project, query) =>
  view.toEntries(await glab.api(project.host, view.searchEndpoint(project, query)), project, query);

// One file per project holds the searches of the last ttl
async function codeItems(project, view, filter) {
  const query = filter.trim();
  if (query.length < view.minLength) return { items: [{ title: `Search the code of ${project.path}`, subtitle: `Type at least ${view.minLength} characters`, valid: false }] };
  const { entry, failed, loading } = await cachedKey(viewCacheName(project, view), query, { ttl: view.ttl }, viewArgs(project, view));
  return listItems({
    entries: entry?.data,
    loading: loading && `code search for "${query}"`,
    errors: [entry?.error ?? failed],
    empty: entry && !entry.error && { title: `Nothing found for "${query}"`, subtitle: "GitLab searches the default branch only" },
  });
}

async function viewItems(project, view, filter) {
  if (view.searchEndpoint) return codeItems(project, view, filter);
  if (view.entries) return listItems({ entries: search(view.entries(project), filter) });
  // A view with cacheView shows another view's cache, with its own ttl
  const source = VIEWS.find((v) => v.id === view.cacheView) ?? view;
  const { cache: stored, loading } = await cached(viewCacheName(project, source), view.ttl, viewArgs(project, source));
  const cache = stored?.data && view.fromCache ? { ...stored, data: view.fromCache(stored.data, project) } : stored;
  // The cached list only holds open ones, so a number not in it is looked up on its own to find closed and merged ones too.
  // One file per list holds the looked-up numbers, and the text search finds them as well
  const open = cache?.data ?? [];
  const lookupName = `${viewCacheName(project, view)}_lookup`;
  const openIids = new Set(open.map((e) => e.iid));
  const found = view.byNumber ? (await remembered(lookupName)).filter((e) => !openIids.has(e.iid)) : [];
  let entries = search([...open, ...found], filter);
  const number = view.byNumber && numberQuery(filter);
  const lookup = number && cache?.data && !openIids.has(Number(number)) ? await cachedKey(lookupName, number, LOOKUP, viewArgs(project, view)) : {};
  if (number) entries = exactNumberFirst(entries, number);
  return listItems({
    entries,
    // The list's own loading row only shows before its first result, a lookup's while it runs
    loading: (loading && !cache && view.title.toLowerCase()) || (lookup.loading && `${view.title.toLowerCase().replace(/s$/, "")} ${number}`),
    rerun: loading || lookup.loading,
    errors: [cache?.error, lookup.entry?.error ?? lookup.failed],
    empty: cache?.data && { title: `No ${view.title.toLowerCase()} found`, subtitle: project.path },
  });
}

async function mineViewItems(view, filter) {
  const { cache, loading } = await cached(`mine_${view.id}`, MINE_TTL, [view.id]);
  return listItems({
    entries: search(cache?.data ?? [], filter),
    loading: loading && !cache && view.title.toLowerCase(),
    rerun: loading,
    errors: [cache?.error],
    empty: cache?.data && { title: `No ${view.title.toLowerCase()} found` },
  });
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
    const list = listItems({
      entries: matchProjects(projects, r.query),
      loading: loading && !cache && "projects",
      errors: [cache?.error],
      empty: cache?.data && { title: "No projects found", subtitle: r.query.trim() },
      toItems: projectItems(projects),
    });
    result = { items: [...mineItems(r.query), ...list.items] };
  }
  return output({ items: result.items, rerun: loading || result.rerun });
}
