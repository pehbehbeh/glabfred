import { ago, errorItems, exactNumberFirst, linkItem, loadingItem, numberQuery, output, search } from "./alfred.js";
import { cached, readCache, writeRefresh } from "./cache.js";
import { commandItems } from "./commands.js";
import * as glab from "./glab.js";
import { menuItems } from "./menu.js";
import { fetchMine, MINE, mineItems } from "./mine.js";
import { fetchProjects, projectItems } from "./projects.js";
import { route } from "./router.js";
import { fetchView, VIEWS } from "./views/index.js";

const PROJECTS_TTL = 60 * 60 * 1000;
const MINE_TTL = 60 * 1000;
// Closed issues and merged MRs rarely change, so a looked-up number is refreshed only after this
const LOOKUP_TTL = 60 * 60 * 1000;
// A found entry that wasn't looked up again for this long is dropped
const LOOKUP_KEEP = 30 * 24 * 60 * 60 * 1000;
const MAX_ITEMS = 200;

const viewCacheName = (project, view) => `${project.host}_${project.id}_${view.id}`;

export async function refresh(name, [viewId, host, id, number] = []) {
  await writeRefresh(name, async () => {
    const previous = await readCache(name);
    try {
      if (name === "projects") return await fetchProjects(glab, previous);
      if (!host) return await fetchMine(glab, MINE.find((v) => v.id === viewId), previous);
      const project = (await readCache("projects"))?.data?.find((p) => p.host === host && String(p.id) === id);
      if (!project) return { error: "Project not found" };
      const view = VIEWS.find((v) => v.id === viewId);
      if (number) return await lookupNumber(view, project, number, previous);
      return { data: await fetchView(view, project, glab.api) };
    } catch (error) {
      // Keep the last good data next to the error, so a network blip doesn't empty the list
      return { data: previous?.data, error: glab.errorText(error) };
    }
  });
}

// A failed lookup is retried soon, like any cache that holds an error
const isFresh = (entry) => entry && Date.now() - entry.time < (entry.error ? 30 * 1000 : LOOKUP_TTL);

async function lookupNumber(view, project, number, previous) {
  let entry;
  try {
    entry = { data: view.toEntries([await glab.api(project.host, view.byNumber(project, number))], project) };
  } catch (error) {
    // A number that doesn't exist is no error, it just has no entry. A network blip keeps what was found before
    entry = /\b404\b/.test(glab.errorText(error)) ? { data: [] } : { data: previous?.numbers?.[number]?.data ?? [], error: glab.errorText(error) };
  }
  // Misses and errors go once stale, so typos don't pile up
  const keep = (e) => (e.data.length > 0 ? Date.now() - e.time < LOOKUP_KEEP : isFresh(e));
  const numbers = Object.fromEntries(Object.entries(previous?.numbers ?? {}).filter(([, e]) => keep(e)));
  numbers[number] = { ...entry, time: Date.now() };
  return { numbers };
}

async function viewItems(project, view, filter) {
  const { cache, loading } = await cached(viewCacheName(project, view), view.ttl, [view.id, project.host, String(project.id)]);
  const items = [];
  if (loading && !cache) items.push(loadingItem(view.title.toLowerCase()));
  items.push(...errorItems(cache?.error));
  // The cached list only holds open ones, so a number not in it is looked up on its own to find closed and merged ones too.
  // One file per list holds the looked-up numbers, and the text search finds them as well
  const open = cache?.data ?? [];
  const lookupName = `${viewCacheName(project, view)}_lookup`;
  const openIids = new Set(open.map((e) => e.iid));
  const remembered = view.byNumber
    ? Object.values((await readCache(lookupName))?.numbers ?? {}).flatMap((e) => e.data).filter((e) => !openIids.has(e.iid))
    : [];
  let entries = search([...open, ...remembered], filter);
  let lookupLoading = false;
  const number = view.byNumber && numberQuery(filter);
  // While typing 123, a lookup still running for 1 holds the lock, so 12 is skipped
  if (number && cache?.data && !openIids.has(Number(number))) {
    const args = [view.id, project.host, String(project.id), number];
    const lookup = await cached(lookupName, LOOKUP_TTL, args, (c) => !isFresh(c.numbers?.[number]));
    const current = lookup.cache?.numbers?.[number];
    lookupLoading = !current && lookup.loading;
    if (lookupLoading) items.push(loadingItem(`${view.title.toLowerCase().replace(/s$/, "")} ${number}`));
    items.push(...errorItems(current?.error));
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
