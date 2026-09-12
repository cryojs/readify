import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  manifest: {
    name: "Readify",
    description: "Customize your reading experience on any website",
    permissions: ["storage", "tabs"],
    host_permissions: ["https://generativelanguage.googleapis.com/*"],
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
