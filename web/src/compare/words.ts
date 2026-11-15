// Story 8.7: the words of the side-by-side view. Interface labels only; no number is written here.
export const COMPARE_WORDS = {
  start: "Compare with another area",
  stop: "Stop comparing",
  pick: "Choose the second area",
  change: "Change second area",
  heading: "Two areas side by side",
  sharedScale: "One colour scale for both areas: the same count has the same colour in each.",
  notShared: "These two areas could not be put on one colour scale, so the same count may have a different colour in each.",
  second: "Second area",
  first: "First area",
  loading: "Loading…",
  // A refused or unreachable second area; the first area's calendar is not hidden by it.
  failed: "The second area could not be loaded.",
} as const;
