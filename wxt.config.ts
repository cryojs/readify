import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Readify",
    description: "Customize your reading experience on any website",
    permissions: ["storage", "tabs", "contextMenus"],
    commands: {
      "simplify-selection": {
        description: "Simplify selected text on the current page",
        suggested_key: {
          default: "Alt+Shift+S",
          mac: "Alt+Shift+S",
        },
      },
      "shorten-selection": {
        description: "Shorten selected text on the current page",
        suggested_key: {
          default: "Alt+Shift+H",
          mac: "Alt+Shift+H",
        },
      },
      "ask-followup": {
        description: "Ask a follow-up about selected text",
        suggested_key: {
          default: "Alt+Shift+A",
          mac: "Alt+Shift+A",
        },
      },
    },
    host_permissions: [
      "https://generativelanguage.googleapis.com/*",
      "https://api.groq.com/*",
      "https://api.x.ai/*",
    ],
    web_accessible_resources: [
      {
        resources: ["assets/*.woff2", "assets/*.woff"],
        matches: ["<all_urls>"],
      },
    ],
  },
  vite: () => ({
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./"),
      },
    },
  }),
});
