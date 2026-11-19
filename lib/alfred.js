export const matches = (haystack, query) => {
  const text = haystack.toLowerCase();
  return query.toLowerCase().split(/\s+/).filter(Boolean).every((word) => text.includes(word));
};

// Entries whose title matches come first: "storage" should find StorageLocation.php before storage/logs/.gitignore
export const search = (entries, query) => {
  const found = entries.filter((e) => matches(e.haystack, query));
  return [...found.filter((e) => matches(e.title, query)), ...found.filter((e) => !matches(e.title, query))];
};

export const ago = (iso, now = Date.now()) => {
  const seconds = (now - Date.parse(iso)) / 1000;
  const units = [["y", 31536000], ["mo", 2592000], ["d", 86400], ["h", 3600], ["m", 60]];
  for (const [unit, size] of units) if (seconds >= size) return `${Math.floor(seconds / size)}${unit} ago`;
  return "just now";
};

export const linkItem = (title, subtitle, url, copy = url) => ({
  uid: url,
  title,
  subtitle,
  arg: url,
  quicklookurl: url,
  text: { copy: url, largetype: title },
  mods: { alt: { arg: copy, subtitle: `Copy ${copy}` } },
});

export const loadingItem = (what) => ({ title: `Loading ${what} via glab…`, valid: false });

export const errorItems = (error) =>
  (error?.split("\n").filter(Boolean) ?? []).map((line) => ({ title: "Could not load from GitLab", subtitle: line, valid: false }));

export const output = ({ items, rerun }) => JSON.stringify({ ...(rerun && { rerun: 0.5 }), items });
