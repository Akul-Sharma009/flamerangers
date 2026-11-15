import { useEffect, useState } from "react";
import { client } from "./api/client";
import { Masthead } from "./components/Masthead";
import { PlaceholderBanner } from "./components/PlaceholderBanner";
import { AboutPage } from "./pages/AboutPage";
import { CalendarPage } from "./pages/CalendarPage";
import { EvidencePage } from "./pages/EvidencePage";
import { GlobePage } from "./pages/GlobePage";
import { useRoute } from "./route";

export default function App() {
  const route = useRoute();
  // /meta decides the placeholder banner, which every view shows.
  const [placeholder, setPlaceholder] = useState(false);
  useEffect(() => {
    client.getMeta().then((m) => setPlaceholder(m.placeholder), () => undefined);
  }, []);

  return (
    <>
      <PlaceholderBanner placeholder={placeholder} />
      <Masthead route={route} />
      {route === "calendar" ? <CalendarPage /> : route === "globe" ? <GlobePage /> : route === "evidence" ? <EvidencePage /> : <AboutPage />}
    </>
  );
}
