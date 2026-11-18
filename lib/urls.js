// Encodes each segment but keeps the slashes: GitLab's own web URLs use raw slashes in branch names and file paths,
// and some instances behind a proxy reject an encoded %2F
export const encodePath = (path) => path.split("/").map(encodeURIComponent).join("/");

// The instance URL including a relative URL root (https://host/gitlab), which new URL(...).origin would drop
export const instanceUrl = (p) => (p.url.endsWith(`/${p.path}`) ? p.url.slice(0, -p.path.length - 1) : new URL(p.url).origin);
