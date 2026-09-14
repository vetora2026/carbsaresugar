import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://carbsaresugar.com",
  output: "static",
  trailingSlash: "always",
  // lastmod is the build date for every URL. Pages are not tracked individually.
  integrations: [tailwind({ applyBaseStyles: true }), sitemap({ lastmod: new Date() })],
});
