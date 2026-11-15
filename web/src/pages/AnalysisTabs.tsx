import { useState, type ReactNode } from "react";

export interface AnalysisTab {
  id: string;
  label: string;
  panel: ReactNode;
}

/** One tab block for the analysis charts. Only the active panel is mounted. */
export function AnalysisTabs({ tabs }: { tabs: AnalysisTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  if (tabs.length === 0) return null;
  const current = tabs.find((t) => t.id === active) ?? tabs[0];
  return (
    <div className="analysis">
      <div className="analysis-tabs" role="tablist" aria-label="Charts for this area">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`analysis-tab-${t.id}`}
            aria-selected={current.id === t.id}
            aria-controls={`analysis-panel-${t.id}`}
            tabIndex={current.id === t.id ? 0 : -1}
            onClick={() => setActive(t.id)}
            onKeyDown={(e) => {
              const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
              if (!step) return;
              e.preventDefault();
              const next = tabs[(tabs.findIndex((x) => x.id === t.id) + step + tabs.length) % tabs.length];
              setActive(next.id);
              document.getElementById(`analysis-tab-${next.id}`)?.focus();
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`analysis-panel-${current.id}`} aria-labelledby={`analysis-tab-${current.id}`}>
        {current.panel}
      </div>
    </div>
  );
}
