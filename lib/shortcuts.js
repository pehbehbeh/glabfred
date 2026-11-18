// Alfred passes each field of the Workflow's Configuration as an environment variable. An empty field falls back to the default
export const shortcut = (id, fallback) => process.env[`shortcut_${id}`]?.trim() || fallback;
