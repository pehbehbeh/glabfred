import { matches } from "./alfred.js";
import { errorText } from "./glab.js";

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

export async function fetchProjects({ api, loggedInHosts }, previous) {
  const hosts = await loggedInHosts();
  const endpoint = "projects?membership=true&archived=false&simple=true&per_page=100";
  const results = await Promise.allSettled(hosts.map((host) => api(host, endpoint, { paginate: true })));
  const projects = [];
  const errors = [];
  results.forEach((r, i) => {
    const host = hosts[i];
    if (r.status === "fulfilled") {
      projects.push(...r.value.map((p) => toProject(host, p)));
    } else {
      // Keep the last known projects of a host that is temporarily unreachable
      projects.push(...(previous?.data?.filter((p) => p.host === host) ?? []));
      errors.push(`${host}: ${errorText(r.reason)}`);
    }
  });
  if (hosts.length === 0) errors.push("No GitLab host logged in. Run `glab auth login`.");
  projects.sort((a, b) => Date.parse(b.activity) - Date.parse(a.activity));
  return { data: projects, error: errors.join("\n") || undefined };
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
      subtitle: `${p.host} · ${p.path}`,
      valid: false,
      autocomplete: `${projectKey(p, projects)} `,
      text: { copy: p.url, largetype: p.url },
      mods: {
        cmd: { valid: true, arg: p.url, subtitle: "Open in browser" },
        alt: { valid: true, arg: p.path, subtitle: `Copy ${p.path}` },
      },
    }));
