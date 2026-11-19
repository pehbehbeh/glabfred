// Section anchors are the ids in GitLab's settings templates (app/views/projects/...). GitLab expands a section whose id is in the URL hash
const PAGES = [
  ["General", "/edit", "project name", [
    ["Naming, description, topics", "js-general-settings", "avatar"],
    ["Visibility, project features, permissions", "js-shared-permissions", "public private internal email notifications"],
    ["Badges", "js-badges-settings", ""],
    ["Advanced", "js-project-advanced-settings", "housekeeping export archive change path rename transfer delete"],
  ]],
  ["Members", "/-/project_members", "users invite access roles", []],
  ["Integrations", "/-/settings/integrations", "slack jira", []],
  ["Webhooks", "/-/hooks", "hooks", []],
  ["Access tokens", "/-/settings/access_tokens", "project token pat api", []],
  ["Repository", "/-/settings/repository", "", [
    ["Branch defaults", "branch-defaults-settings", "default branch"],
    ["Branch rules", "branch-rules", "approvals"],
    ["Mirroring repositories", "js-push-remote-settings", "mirror push pull"],
    ["Protected branches", "js-protected-branches-settings", "allowed to merge push force"],
    ["Protected tags", "js-protected-tags-settings", "allowed to create"],
    ["Deploy tokens", "js-deploy-tokens", "registry packages"],
    ["Deploy keys", "js-deploy-keys-settings", "ssh"],
    ["Repository maintenance", "cleanup", "cleanup size"],
  ]],
  ["Merge requests", "/-/settings/merge_requests", "merge method squash approvals pipelines must succeed", []],
  ["CI/CD", "/-/settings/ci_cd", "ci cd", [
    ["General pipelines", "js-general-pipeline-settings", "timeout ci config path"],
    ["Auto DevOps", "autodevops-settings", ""],
    ["Runners", "js-runners-settings", "shared group"],
    ["Artifacts", "js-artifacts-settings", "keep latest"],
    ["Variables", "js-cicd-variables-settings", "env environment secrets"],
    ["Pipeline trigger tokens", "js-pipeline-triggers", "trigger"],
    ["Deploy freezes", "js-deploy-freeze-settings", "freeze"],
    ["Job token permissions", "js-token-access", "ci job token"],
    ["Secure files", "js-secure-files", ""],
  ]],
  ["Packages and registries", "/-/settings/packages_and_registries", "container registry cleanup", []],
  ["Monitor", "/-/settings/operations", "operations error tracking alerts", []],
  ["Usage quotas", "/-/usage_quotas", "storage", []],
];

export default {
  id: "settings",
  // Like ⌘, for the settings of a Mac app
  defaultKey: ",",
  title: "Settings",
  aliases: "settings setting",
  unit: "pages",
  page: () => "/edit",
  // No API call: the list is the same for every project
  entries: (p) =>
    PAGES.flatMap(([page, path, words, sections]) => [
      { title: page, subtitle: "Settings", url: p.url + path, copy: p.url + path, haystack: `${page} ${words}` },
      ...sections.map(([title, anchor, more]) => ({
        title,
        subtitle: `Settings · ${page}`,
        url: `${p.url}${path}#${anchor}`,
        copy: `${p.url}${path}#${anchor}`,
        haystack: `${title} ${page} ${more}`,
      })),
    ]),
};
