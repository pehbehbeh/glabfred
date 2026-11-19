import { statusIcon } from "./pipelines.js";

// Only the latest 100: busy projects run thousands of jobs
export default {
  id: "jobs",
  defaultKey: "j",
  title: "Jobs",
  aliases: "job",
  unit: "recent",
  ttl: 60 * 1000,
  page: () => "/-/jobs",
  endpoint: (p) => `projects/${p.id}/jobs?per_page=100`,
  toEntries: (jobs) =>
    jobs.map((j) => ({
      title: `${statusIcon(j.status)} ${j.name}`,
      subtitle: `#${j.id} · ${j.stage} · ${j.ref} · ${j.status}`,
      url: j.web_url,
      copy: j.web_url,
      haystack: `${j.name} ${j.stage} ${j.ref} ${j.status} ${j.id}`,
      time: j.finished_at ?? j.created_at,
    })),
};
