import { fromAllHosts } from "./hosts.js";
import { shortcut } from "./shortcuts.js";
import { assignKeys } from "./views/index.js";

// references.full is "group/project!12", references.short "!12"
const projectPath = (r) => r.full.slice(0, -r.short.length);

const mrEntry = (host, m) => ({
  host,
  title: `${m.references.short} ${m.title}`,
  subtitle: [projectPath(m.references), m.author?.username, m.draft && "draft", m.source_branch].filter(Boolean).join(" · "),
  url: m.web_url,
  copy: m.references.full,
  haystack: `${m.references.full} ${m.title} ${m.author?.username} ${m.source_branch}`,
  time: m.updated_at,
});

const issueEntry = (host, i) => {
  const people = i.assignees?.map((a) => a.username) ?? [];
  return {
    host,
    title: `${i.references.short} ${i.title}`,
    subtitle: [projectPath(i.references), ...i.labels].join(" · "),
    url: i.web_url,
    copy: i.references.full,
    haystack: `${i.references.full} ${i.title} ${people.join(" ")} ${i.labels.join(" ")}`,
    time: i.updated_at,
  };
};

// A todo without a target (e.g. its issue was deleted) falls back to the todo's text
const todoEntry = (host, t) => {
  const ref = t.target?.references;
  const action = t.action_name.replaceAll("_", " ");
  const title = t.target?.title ?? t.body;
  return {
    host,
    title: ref ? `${ref.short} ${title}` : title,
    subtitle: [action, t.project?.path_with_namespace, t.author?.username].filter(Boolean).join(" · "),
    url: t.target_url,
    copy: ref?.full ?? t.target_url,
    haystack: `${ref?.full ?? ""} ${title} ${action} ${t.author?.username}`,
    time: t.updated_at ?? t.created_at,
  };
};

// Default keys are GitLab's global shortcuts (Shift+m, Shift+i, Shift+r, Shift+t), see docs.gitlab.com/user/shortcuts
export const MINE = assignKeys(
  [
    {
      id: "my_merge_requests",
      defaultKey: "M",
      aliases: "",
      title: "My merge requests",
      endpoints: () => ["merge_requests?scope=created_by_me&state=opened&per_page=100", "merge_requests?scope=assigned_to_me&state=opened&per_page=100"],
      toEntry: mrEntry,
    },
    {
      id: "my_issues",
      defaultKey: "I",
      aliases: "",
      title: "My issues",
      endpoints: () => ["issues?scope=assigned_to_me&state=opened&per_page=100"],
      toEntry: issueEntry,
    },
    {
      id: "review_requests",
      defaultKey: "R",
      aliases: "",
      title: "Review requests",
      needsUser: true,
      endpoints: (user) => [`merge_requests?scope=all&state=opened&reviewer_username=${encodeURIComponent(user.username)}&per_page=100`],
      toEntry: mrEntry,
    },
    {
      id: "todos",
      defaultKey: "T",
      aliases: "",
      title: "To-do items",
      endpoints: () => ["todos?state=pending&per_page=100"],
      toEntry: todoEntry,
    },
  ],
  (id) => shortcut(id),
);

export const findMine = (word) => MINE.find((v) => v.key === word);

export async function fetchMine(glab, view, previous) {
  const result = await fromAllHosts(glab, previous, async (host) => {
    const user = view.needsUser && (await glab.api(host, "user"));
    const pages = await Promise.all(view.endpoints(user).map((e) => glab.api(host, e, { paginate: true })));
    return pages.flat().map((x) => view.toEntry(host, x));
  });
  // An MR that is both created by and assigned to me comes back twice. Two todos on the same target show as one
  const seen = new Set();
  result.data = result.data.filter((e) => !seen.has(e.url) && seen.add(e.url));
  result.data.sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
  return result;
}

// Shown above the projects on an empty query, so the lists can be found without knowing the keys
export const mineItems = (query) =>
  (query.trim() === "" ? MINE : []).map((v) => ({
    title: v.title,
    subtitle: `${v.key} · on all hosts`,
    valid: false,
    autocomplete: `${v.key} `,
  }));
