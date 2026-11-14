// The expanded "change area" panel: pick a featured area, draw one, or type it.
import { useState, type FormEvent } from "react";
import { featuredAreas, type AoiInput, type FeaturedArea } from "./featured";
import { MapView, type DrawMode } from "./MapView";
import {
  parseCorners, parseVertices, type CornerField, type Corners, type MultiPolygon, type Polygon, type TypedResult,
} from "./typed";
import { typedProblemText } from "./words";

export type PickerTab = "featured" | "draw" | "type";
export type TypedForm = "corners" | "vertices";

interface Props {
  /** The name of the area on show, to mark it in the featured list. */
  currentName: string | null;
  onSelect: (aoi: AoiInput) => void;
  onClose: () => void;
  initialTab?: PickerTab;
  initialForm?: TypedForm;
  /** For tests: a refused typed entry to show as if just submitted. */
  initialRefusal?: { corners?: Corners; vertices?: string };
  areas?: FeaturedArea[];
}

const TABS: { id: PickerTab; label: string }[] = [
  { id: "featured", label: "Featured areas" },
  { id: "draw", label: "Draw" },
  { id: "type", label: "Type coordinates" },
];

const CORNERS: { field: CornerField; label: string; hint: string }[] = [
  { field: "west", label: "West", hint: "longitude" },
  { field: "south", label: "South", hint: "latitude" },
  { field: "east", label: "East", hint: "longitude" },
  { field: "north", label: "North", hint: "latitude" },
];

const EMPTY: Corners = { west: "", south: "", east: "", north: "" };

/** A typed area goes out without a name: only featured areas carry one. */
function typedAoi(geometry: Polygon | MultiPolygon): AoiInput {
  return { name: null, geometry };
}

export function AreaPicker({
  currentName, onSelect, onClose, initialTab = "featured", initialForm = "corners", initialRefusal, areas,
}: Props) {
  const list = areas ?? featuredAreas();
  const [tab, setTab] = useState<PickerTab>(initialTab);
  const [form, setForm] = useState<TypedForm>(initialForm);
  const [corners, setCorners] = useState<Corners>(initialRefusal?.corners ?? EMPTY);
  const [vertices, setVertices] = useState(initialRefusal?.vertices ?? "");
  const [refusal, setRefusal] = useState<TypedResult | null>(() => {
    if (initialRefusal?.corners) return parseCorners(initialRefusal.corners);
    if (initialRefusal?.vertices !== undefined) return parseVertices(initialRefusal.vertices);
    return null;
  });
  const [drawMode, setDrawMode] = useState<DrawMode>("rectangle");
  const [drawn, setDrawn] = useState<Polygon | null>(null);

  const submitTyped = (e: FormEvent) => {
    e.preventDefault();
    const result = form === "corners" ? parseCorners(corners) : parseVertices(vertices);
    if (result.ok) {
      setRefusal(null);
      onSelect(typedAoi(result.geometry));
    } else {
      setRefusal(result);
    }
  };

  const bad = refusal && !refusal.ok ? refusal : null;
  const badField = (f: CornerField) => (bad?.fields?.includes(f) ? true : undefined);

  return (
    <div className="picker" id="area-picker">
      <div className="picker-tabs" role="tablist" aria-label="Ways to choose an area">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`picker-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`picker-panel-${t.id}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
        <button type="button" className="picker-close" onClick={onClose}>
          Close
        </button>
      </div>

      {tab === "featured" ? (
        <div role="tabpanel" id="picker-panel-featured" aria-labelledby="picker-tab-featured">
          <ul className="featured">
            {list.map((a) => (
              <li key={a.id}>
                <button
                  type="button"
                  aria-current={a.name === currentName ? "true" : undefined}
                  onClick={() => onSelect(a.aoi)}
                >
                  {a.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {tab === "draw" ? (
        <div role="tabpanel" id="picker-panel-draw" aria-labelledby="picker-tab-draw">
          <div className="drawmodes" role="group" aria-label="Shape">
            {(["rectangle", "polygon"] as const).map((m) => (
              <button key={m} type="button" aria-pressed={drawMode === m} onClick={() => setDrawMode(m)}>
                {m === "rectangle" ? "Rectangle" : "Polygon"}
              </button>
            ))}
          </div>
          <MapView
            variant="draw"
            geometry={drawn}
            drawMode={drawMode}
            onDrawn={setDrawn}
            label="Map for drawing an area"
          />
          <div className="picker-actions">
            <button type="button" className="primary" disabled={drawn === null} onClick={() => drawn && onSelect(typedAoi(drawn))}>
              Show this area
            </button>
            {drawn ? (
              <button type="button" onClick={() => setDrawn(null)}>
                Clear
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "type" ? (
        <form
          role="tabpanel"
          id="picker-panel-type"
          aria-labelledby="picker-tab-type"
          className="typed"
          onSubmit={submitTyped}
          noValidate
        >
          <div className="typed-forms" role="radiogroup" aria-label="Shape">
            {(["corners", "vertices"] as const).map((f) => (
              <label key={f}>
                <input
                  type="radio"
                  name="typed-form"
                  checked={form === f}
                  onChange={() => {
                    setForm(f);
                    setRefusal(null);
                  }}
                />
                {f === "corners" ? "Box corners" : "Polygon vertices"}
              </label>
            ))}
          </div>

          {form === "corners" ? (
            <div className="corners">
              {CORNERS.map(({ field, label, hint }) => (
                <label key={field} className={badField(field) ? "bad" : undefined}>
                  <span>
                    {label} <small>{hint}</small>
                  </span>
                  <input
                    type="text"
                    inputMode="decimal"
                    autoComplete="off"
                    name={field}
                    value={corners[field]}
                    aria-invalid={badField(field)}
                    aria-describedby={bad ? "typed-refusal" : undefined}
                    onChange={(e) => setCorners({ ...corners, [field]: e.target.value })}
                  />
                </label>
              ))}
            </div>
          ) : (
            <label className={bad ? "vertices bad" : "vertices"}>
              <span>
                Vertices <small>longitude, latitude · one per line · end with the first</small>
              </span>
              <textarea
                name="vertices"
                rows={6}
                spellCheck={false}
                value={vertices}
                aria-invalid={bad ? true : undefined}
                aria-describedby={bad ? "typed-refusal" : undefined}
                onChange={(e) => setVertices(e.target.value)}
              />
            </label>
          )}

          {bad ? (
            <p id="typed-refusal" className="problem" role="alert" data-problem={bad.problem}>
              {typedProblemText(bad.problem)}
              {bad.lines ? <span className="lines"> Lines {bad.lines.join(", ")}</span> : null}
            </p>
          ) : null}

          <div className="picker-actions">
            <button type="submit" className="primary">
              Show this area
            </button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
