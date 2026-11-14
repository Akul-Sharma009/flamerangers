// The only build-time variable the app reads: the data service base URL.
// Unset or empty means fixture mode (null): the app reads contract/fixture/.
const raw = (import.meta.env.VITE_SERVICE_BASE_URL as string | undefined)?.trim() ?? "";
export const SERVICE_BASE_URL: string | null = raw === "" ? null : raw.replace(/\/+$/, "");
