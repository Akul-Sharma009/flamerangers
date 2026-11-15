import { useEffect, useState } from "react";

// Hash routes, so the static build works on any host with no server rewrite.
export const ROUTES = [
  { id: "calendar", hash: "#/", label: "Calendar" },
  { id: "globe", hash: "#/globe", label: "Globe" }, // Story 8.10: secondary view; the calendar stays the default
  { id: "evidence", hash: "#/evidence", label: "Evidence" },
  { id: "about", hash: "#/about", label: "About the data" },
] as const;

export type RouteId = (typeof ROUTES)[number]["id"];

export function routeFromHash(hash: string): RouteId {
  // Story 8.1: the calendar's state rides after a "?" ("#/?area=sumatra"); the route is what precedes it.
  const found = ROUTES.find((r) => r.hash === hash.split("?")[0]);
  return found ? found.id : "calendar";
}

export function useRoute(): RouteId {
  const [route, setRoute] = useState<RouteId>(() => routeFromHash(window.location.hash));
  useEffect(() => {
    const onChange = () => setRoute(routeFromHash(window.location.hash));
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}
