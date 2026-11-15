import { useEffect, useState } from "react";
import { rangeRequest, type AoiRequest, type DateRange, type Meta, type RawSplice, type ServiceClient } from "../api/client";

export type SpliceState = { status: "idle" } | { status: "loading" } | { status: "ready"; splice: RawSplice } | { status: "failed" };

/** Asks /raw_splice once, the first time `wanted` turns true, and again when the area, range or record changes. */
export function useRawSplice(service: ServiceClient | null | undefined, meta: Meta | null, aoi: AoiRequest, range: DateRange | null, wanted: boolean): SpliceState {
  const key = meta ? `${meta.record_version}|${JSON.stringify(aoi.geometry)}|${range?.start ?? ""}|${range?.end ?? ""}` : "";
  const [state, setState] = useState<{ key: string; s: SpliceState }>({ key, s: { status: "idle" } });
  useEffect(() => {
    if (!wanted || !meta || !service?.postRawSplice) return;
    if (state.key === key && state.s.status !== "idle") return;
    let live = true;
    setState({ key, s: { status: "loading" } });
    service.postRawSplice(rangeRequest(meta, aoi, range)).then(
      (splice) => live && setState({ key, s: { status: "ready", splice } }),
      () => live && setState({ key, s: { status: "failed" } }),
    );
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wanted, key, service]);
  return state.key === key ? state.s : { status: "idle" };
}
