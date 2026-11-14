import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { parse } from "yaml";

// contract/messages.yaml is the only source of the words the UI shows for a
// state, caution or problem. It is parsed at build time into a virtual module,
// so the browser ships plain JSON and no YAML parser.
const MESSAGES_PATH = fileURLToPath(new URL("../contract/messages.yaml", import.meta.url));
const VIRTUAL_ID = "virtual:messages";
const RESOLVED_ID = "\0" + VIRTUAL_ID;

function contractMessages(): Plugin {
  return {
    name: "contract-messages",
    resolveId(id) {
      return id === VIRTUAL_ID ? RESOLVED_ID : undefined;
    },
    load(id) {
      if (id !== RESOLVED_ID) return undefined;
      this.addWatchFile(MESSAGES_PATH);
      const parsed: unknown = parse(readFileSync(MESSAGES_PATH, "utf8"));
      return `export default ${JSON.stringify(parsed)};`;
    },
  };
}

export default defineConfig({
  plugins: [react(), contractMessages()],
  server: {
    // The fixture client imports contract/fixture/*.json from outside web/.
    fs: { allow: [".."] },
  },
});
