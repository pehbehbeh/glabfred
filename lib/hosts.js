import { errorText } from "./glab.js";

// fetchHost(host) returns the host's entries, each with a `host` field
export async function fromAllHosts({ loggedInHosts }, previous, fetchHost) {
  const hosts = await loggedInHosts();
  const results = await Promise.allSettled(hosts.map(fetchHost));
  const data = [];
  const errors = [];
  results.forEach((r, i) => {
    const host = hosts[i];
    if (r.status === "fulfilled") {
      data.push(...r.value);
    } else {
      // Keep the last known entries of a host that is temporarily unreachable
      data.push(...(previous?.data?.filter((e) => e.host === host) ?? []));
      errors.push(`${host}: ${errorText(r.reason)}`);
    }
  });
  if (hosts.length === 0) errors.push("No GitLab host logged in. Run `glab auth login`.");
  const hostList = hosts.map((host, i) => ({ host, error: results[i].status === "rejected" ? errorText(results[i].reason) : undefined }));
  return { data, error: errors.join("\n") || undefined, hosts: hostList };
}
