import { messages } from "../api/messages";

export function AboutPage() {
  return (
    <main className="page stub">
      <h1>About the data</h1>
      <p>{messages.notes.hotspot_definition}</p>
      <p>{messages.notes.record_switch}</p>
      <p>The rest of this page is not built yet.</p>
    </main>
  );
}
