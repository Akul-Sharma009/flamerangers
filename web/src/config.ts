// The only build-time variable the app reads: the data service base URL.
export const SERVICE_BASE_URL: string =
  (import.meta.env.VITE_SERVICE_BASE_URL as string | undefined) ?? "http://localhost:8000";
