// Story 8.2: the "Country or region" tab. A name search over countries and first-level units;
// choosing one loads its outline and uses it as the area. The calendar's locator map draws it.
import { useEffect, useState } from "react";
import { messages } from "../../api/messages";
import type { AoiInput } from "../featured";
import "./admin.css";
import { ADMIN_COPY } from "./copy";
import { adminLabel, loadAdminIndex, loadAdminUnit, searchAdmin, type AdminEntry } from "./units";

interface Props {
  onSelect: (aoi: AoiInput) => void;
  /** For tests: the index to search instead of the shipped one. */
  index?: AdminEntry[];
}

export function AdminPicker({ onSelect, index: given }: Props) {
  const [index, setIndex] = useState<AdminEntry[] | null>(given ?? null);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [refusal, setRefusal] = useState<string | null>(null);

  useEffect(() => {
    if (given) return;
    let live = true;
    loadAdminIndex().then((i) => live && setIndex(i), () => live && setRefusal(messages.client.service_unreachable));
    return () => { live = false; };
  }, [given]);

  const hits = index ? searchAdmin(index, query) : [];

  const choose = async (e: AdminEntry) => {
    setRefusal(null);
    if (e.wide) {
      setRefusal(messages.client.admin_too_wide);
      return;
    }
    setBusy(e.code);
    try {
      const unit = await loadAdminUnit(e.code);
      if (unit) onSelect(unit.aoi);
      else setRefusal(messages.problems.invalid_aoi);
    } catch {
      setRefusal(messages.client.service_unreachable);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div role="tabpanel" id="picker-panel-admin" aria-labelledby="picker-tab-admin" className="admin-picker">
      <label className="admin-search">
        <span>{ADMIN_COPY.label}</span>
        <input
          type="search"
          autoComplete="off"
          spellCheck={false}
          value={query}
          aria-describedby="admin-hint"
          onChange={(e) => { setQuery(e.target.value); setRefusal(null); }}
        />
      </label>
      <p id="admin-hint" className="admin-hint">{ADMIN_COPY.hint}</p>

      {query.trim() !== "" && index && hits.length === 0 ? <p className="admin-none">{ADMIN_COPY.none}</p> : null}

      {hits.length > 0 && index ? (
        <ul className="admin-results" aria-label={ADMIN_COPY.results}>
          {hits.map((e) => (
            <li key={e.code}>
              <button type="button" disabled={busy !== null} aria-busy={busy === e.code || undefined} onClick={() => void choose(e)}>
                <span>{adminLabel(index, e)}</span>
                <small>{e.level === 0 ? ADMIN_COPY.country : ADMIN_COPY.region}</small>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {busy ? <p role="status" className="admin-hint">{ADMIN_COPY.loading}</p> : null}
      {refusal ? (
        <p className="problem" role="alert">{refusal}</p>
      ) : null}
    </div>
  );
}
