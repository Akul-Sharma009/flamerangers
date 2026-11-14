// The build-time variables the app reads. Neither is a secret.

// The data service base URL. Unset or empty means fixture mode (null): the app
// reads contract/fixture/.
const raw = (import.meta.env.VITE_SERVICE_BASE_URL as string | undefined)?.trim() ?? "";
export const SERVICE_BASE_URL: string | null = raw === "" ? null : raw.replace(/\/+$/, "");

// The public repository's web address, for the evidence view's links to the
// planning copies (e.g. https://github.com/<owner>/<repo>). Unset or empty means
// the view names the files without linking them.
const repo = (import.meta.env.VITE_REPO_URL as string | undefined)?.trim() ?? "";
export const REPO_URL: string | null = repo === "" ? null : repo.replace(/\/+$/, "");
