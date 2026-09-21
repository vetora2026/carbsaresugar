// Runs axe over every page of the built site at a phone width.
//
//   npm run build && npm run check:a11y
//   npm run check:a11y -- --rule color-contrast   # only that rule
//
// It starts its own `astro preview`, so it cannot run as part of the build.
// Tags: WCAG 2.0/2.1 A and AA plus WCAG 2.2 AA, which is where target-size
// (the 24px minimum tap target) lives.

import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { assertPortFree, startPreview, launchBrowser } from "./lib.mjs";

const PORT = 4330;
// 127.0.0.1, not localhost: see the note in lib.mjs assertPortFree.
const ORIGIN = `http://127.0.0.1:${PORT}`;
const WIDTH = 375;
const HEIGHT = 812;
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

const args = process.argv.slice(2);
const onlyRule = args.includes("--rule") ? args[args.indexOf("--rule") + 1] : null;
const limit = args.includes("--limit") ? Number(args[args.indexOf("--limit") + 1]) : Infinity;

const sitemap = readFileSync(new URL("../dist/sitemap-0.xml", import.meta.url), "utf8");
const paths = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)]
  .map((m) => new URL(m[1]).pathname)
  .slice(0, limit);
if (paths.length === 0) throw new Error("no URLs in dist/sitemap-0.xml — run npm run build first");

await assertPortFree(PORT);
const preview = await startPreview(PORT);
const browser = await launchBrowser();
const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT } });
// The advertising script never settles, and its iframes are not this site's
// markup, so it is left out: what is checked is the pages as they are built.
await context.route("**://*.googlesyndication.com/**", (route) => route.abort());
await context.route("**://*.doubleclick.net/**", (route) => route.abort());
const page = await context.newPage();

const byRule = new Map();
let pagesWithViolations = 0;

try {
  for (const path of paths) {
    await page.goto(ORIGIN + path, { waitUntil: "networkidle", timeout: 60000 });
    const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
    const found = onlyRule ? violations.filter((v) => v.id === onlyRule) : violations;
    if (found.length === 0) continue;
    pagesWithViolations++;
    console.log(`\n${path}`);
    for (const v of found) {
      byRule.set(v.id, (byRule.get(v.id) ?? 0) + v.nodes.length);
      console.log(`  ${v.id} (${v.impact}) — ${v.nodes.length} node${v.nodes.length === 1 ? "" : "s"}: ${v.help}`);
      for (const node of v.nodes.slice(0, 3)) {
        console.log(`      ${node.target.join(" ")}`);
        const detail = (node.any[0] ?? node.all[0])?.message;
        if (detail) console.log(`        ${detail.replace(/\s+/g, " ").slice(0, 160)}`);
      }
      if (v.nodes.length > 3) console.log(`      … and ${v.nodes.length - 3} more`);
    }
  }
} finally {
  await browser.close();
  preview.kill();
}

console.log(`\n${paths.length} pages checked at ${WIDTH}px, ${pagesWithViolations} with violations.`);
if (byRule.size === 0) {
  console.log("no violations");
} else {
  console.log("violations by rule (nodes across all pages):");
  for (const [rule, count] of [...byRule].sort((a, b) => b[1] - a[1])) console.log(`  ${rule}: ${count}`);
}
process.exit(byRule.size ? 1 : 0);
