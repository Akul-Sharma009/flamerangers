// Story 8.10: the globe page, reached from the calendar (a secondary view; the calendar stays the default).
import { useEffect, useState } from "react";
import { client, type Meta } from "../api/client";
import { messages } from "../api/messages";
import { GlobeView } from "../globe/GlobeView";

export function GlobePage() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    client.getMeta().then(setMeta, () => setFailed(true));
  }, []);
  return (
    <main>
      {meta ? <GlobeView meta={meta} /> : <p className="globe">{failed ? messages.client.service_unreachable : ""}</p>}
      <p className="globe"><a href="#/">Back to the calendar</a></p>
    </main>
  );
}
