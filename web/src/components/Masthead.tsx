import { ROUTES, type RouteId } from "../route";

export function Masthead({ route }: { route: RouteId }) {
  return (
    <header className="mast">
      <span className="title">Burning Activity Ledger</span>
      <nav aria-label="Main">
        {ROUTES.map((r) => (
          <a key={r.id} href={r.hash} aria-current={r.id === route ? "page" : undefined}>
            {r.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
