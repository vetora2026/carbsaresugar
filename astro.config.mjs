import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://carbsaresugar.com",
  output: "static",
  trailingSlash: "always",
  // One stylesheet serves the whole site and it is small enough to carry in the
  // page, which removes the only render-blocking request the site makes.
  build: { inlineStylesheets: "always" },
  // lastmod is the build date for every URL. Pages are not tracked individually.
  integrations: [tailwind({ applyBaseStyles: true }), sitemap({ lastmod: new Date() })],
});
