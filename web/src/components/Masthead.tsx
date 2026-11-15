import { ROUTES, type RouteId } from "../route";

function skipToMain() {
  const main = document.querySelector("main");
  if (!main) return;
  main.setAttribute("tabindex", "-1");
  main.focus();
}

export function Masthead({ route }: { route: RouteId }) {
  return (
    <header className="mast">
      {/* TODO(skip_link): no contract sentence; the lead approves the wording. A button, not an
          href="#...", because the hash is the router. */}
      <button type="button" className="skip" onClick={skipToMain}>
        Skip to the page content
      </button>
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
