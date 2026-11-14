// The small locator at the top of the left column (UI-CONCEPT.md section 3):
// the area on a still map, its name and served size, the scale cautions, and a
// control that opens the picker. There is no large map on the page.
import { useState } from "react";
import type { Calendar } from "../api/client";
import { messages } from "../api/messages";
import { formatCount } from "../format";
import { AreaPicker, type PickerTab, type TypedForm } from "./AreaPicker";
import type { AoiInput } from "./featured";
import { MapView } from "./MapView";
import "./area.css";

export interface LocatorProps {
  /** The area asked for: its outline is drawn and its name used while it loads. */
  selected: AoiInput;
  /** The served answer for it, once it has loaded. Size and cautions come only from here. */
  calendar: Calendar | null;
  /** The problem sentence for the area, when the service refused it. */
  problemText: string | null;
  loading: boolean;
  onSelect: (aoi: AoiInput) => void;
  initialOpen?: boolean;
  initialTab?: PickerTab;
  initialForm?: TypedForm;
}

/** The label for an area with no name: one the user drew or typed. */
export const UNNAMED_AREA = "Your area";

export function AreaLocator({
  selected, calendar, problemText, loading, onSelect, initialOpen = false, initialTab, initialForm,
}: LocatorProps) {
  const [open, setOpen] = useState(initialOpen);
  const name = calendar ? calendar.aoi.name : selected.name ?? null;

  return (
    <section className="locator" aria-label="Area">
      <div className="locator-row">
        <MapView variant="locator" geometry={selected.geometry} label={`Map of ${name ?? UNNAMED_AREA}`} />
        <div className="place">
          Area
          <span className="name">{name ?? UNNAMED_AREA}</span>
          {calendar ? (
            <span className="size" data-field="aoi.area_km2">{formatCount(calendar.aoi.area_km2)} km²</span>
          ) : loading ? (
            <span className="size">Loading…</span>
          ) : null}
          <button
            type="button"
            className="change"
            aria-expanded={open}
            aria-controls="area-picker"
            onClick={() => setOpen(!open)}
          >
            Change area
          </button>
        </div>
      </div>

      {open ? (
        <AreaPicker
          currentName={selected.name ?? null}
          initialTab={initialTab}
          initialForm={initialForm}
          onClose={() => setOpen(false)}
          onSelect={(aoi) => {
            setOpen(false);
            onSelect(aoi);
          }}
        />
      ) : null}

      {problemText ? (
        <p className="problem" role="alert">
          {problemText}
        </p>
      ) : null}
      {calendar?.cautions.map((c) => (
        <p key={c.code} className="caution" data-caution={c.code}>
          {messages.cautions[c.code]}
        </p>
      ))}
    </section>
  );
}
