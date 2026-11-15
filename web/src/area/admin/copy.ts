// The words the country and region tab shows. The refusal for a unit too wide for the service
// is contract/messages.yaml's `admin_too_wide`; the other problem sentences are the contract's own.
export const ADMIN_COPY = {
  tab: "Country or region",
  label: "Name of a country or region",
  hint: "Type part of a name. Countries and first-level regions (states, provinces) are listed.",
  none: "No country or region matches that name.",
  loading: "Loading the outline…",
  country: "Country",
  region: "Region",
  results: "Matching names",
} as const;
