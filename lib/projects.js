import { matches } from "./alfred.js";
import { fromAllHosts } from "./hosts.js";

const MAX_ITEMS = 200;

export const toProject = (host, p) => ({
  host,
  id: p.id,
  name: p.name_with_namespace,
  path: p.path_with_namespace,
  url: p.web_url,
  branch: p.default_branch ?? "HEAD",
  activity: p.last_activity_at,
});

const fetchList = (glab, host, filter) =>
  glab.api(host, `projects?${filter}=true&archived=false&simple=true&per_page=100`, { paginate: true });

// Starred projects come first, and the ones you aren't a member of are searchable too
export async function fetchProjects(glab, previous) {
  const result = await fromAllHosts(glab, previous, async (host) => {
    const [member, starred] = await Promise.all([fetchList(glab, host, "membership"), fetchList(glab, host, "starred")]);
    const starredIds = new Set(starred.map((p) => p.id));
    const memberIds = new Set(member.map((p) => p.id));
    return [...member, ...starred.filter((p) => !memberIds.has(p.id))].map((p) => ({ ...toProject(host, p), starred: starredIds.has(p.id) }));
  });
  result.data.sort((a, b) => b.starred - a.starred || Date.parse(b.activity) - Date.parse(a.activity));
  return result;
}

export function projectKey(project, projects) {
  const ambiguous = projects.some((p) => p !== project && p.path === project.path);
  return ambiguous ? `${project.host}/${project.path}` : project.path;
}

export const findProject = (projects, word) =>
  projects.find((p) => `${p.host}/${p.path}` === word) ?? projects.find((p) => p.path === word);

export const projectItems = (projects, query) =>
  projects
    .filter((p) => matches(`${p.name} ${p.path} ${p.host}`, query))
    .slice(0, MAX_ITEMS)
    .map((p) => ({
      uid: `${p.host}/${p.id}`,
      title: p.name,
      subtitle: `${p.starred ? "★ " : ""}${p.host} · ${p.path}`,
      valid: false,
      autocomplete: `${projectKey(p, projects)} `,
      text: { copy: p.url, largetype: p.url },
      mods: {
        cmd: { valid: true, arg: p.url, subtitle: "Open in browser" },
        alt: { valid: true, arg: p.path, subtitle: `Copy ${p.path}` },
      },
    }));
