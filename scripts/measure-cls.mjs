// Measures cumulative layout shift against the built site.
//
// Runs `astro preview`, loads a page in Chromium at a phone viewport with the
// network and CPU throttled (on an unthrottled localhost the fonts arrive
// before first paint and no shift is ever recorded), and reports the total
// with the element behind each shift.
//
//   node scripts/measure-cls.mjs                      # home page at 375 and 1280
//   node scripts/measure-cls.mjs /foods/ --width 375  # one page at one width
//
// Requires `npm run build` first.

import { startPreview, launchBrowser } from "./lib.mjs";

const args = process.argv.slice(2);
const paths = args.filter((a) => !a.startsWith("--"));
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : Number(args[i + 1]);
};

const PORT = 4329;
const ORIGIN = `http://localhost:${PORT}`;
const PAGES = paths.length ? paths : ["/"];
const WIDTHS = args.includes("--width") ? [flag("width")] : [375, 1280];
const HEIGHT = flag("height", 812);
// Lighthouse's mobile defaults: slow 4G, 4x CPU slowdown.
const THROTTLE = {
  offline: false,
  latency: 150,
  downloadThroughput: (1.6 * 1024 * 1024) / 8,
  uploadThroughput: (750 * 1024) / 8,
};

// Runs in the page before anything else loads.
const observer = () => {
  window.__shifts = [];
  const describe = (node) => {
    if (!node || node.nodeType !== 1) return "(no node)";
    const parts = [];
    for (let el = node; el && el.nodeType === 1 && parts.length < 4; el = el.parentElement) {
      const cls = String(el.className || "")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((c) => `.${c}`)
        .join("");
      parts.unshift(el.tagName.toLowerCase() + (el.id ? `#${el.id}` : "") + cls);
    }
    return parts.join(" > ");
  };
  new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.hadRecentInput) continue;
      window.__shifts.push({
        value: entry.value,
        time: Math.round(entry.startTime),
        sources: (entry.sources || []).map((s) => describe(s.node)),
      });
    }
  }).observe({ type: "layout-shift", buffered: true });
};

async function measure(browser, url, width) {
  const context = await browser.newContext({
    viewport: { width, height: HEIGHT },
    deviceScaleFactor: 2,
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send("Network.emulateNetworkConditions", THROTTLE);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await page.addInitScript(observer);

  await page.goto(url, { waitUntil: "load", timeout: 60000 });
  const title = await page.title();
  if (!/sugar/i.test(title)) throw new Error(`unexpected page at ${url}: "${title}"`);
  await page.waitForTimeout(3000);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);

  const shifts = await page.evaluate(() => window.__shifts);
  await context.close();
  return shifts;
}

const preview = await startPreview(PORT);
const browser = await launchBrowser();
let worst = 0;
try {
  for (const path of PAGES) {
    for (const width of WIDTHS) {
      const shifts = await measure(browser, ORIGIN + path, width);
      const total = shifts.reduce((sum, s) => sum + s.value, 0);
      worst = Math.max(worst, total);
      console.log(`\n${path}  ${width}x${HEIGHT}  CLS ${total.toFixed(4)}  (${shifts.length} shift${shifts.length === 1 ? "" : "s"})`);
      for (const s of shifts) {
        console.log(`  ${s.value.toFixed(4)} at ${s.time}ms`);
        for (const src of s.sources) console.log(`      ${src}`);
      }
    }
  }
} finally {
  await browser.close();
  preview.kill();
}

console.log(`\nworst CLS: ${worst.toFixed(4)}`);
process.exit(0);
