// Shared plumbing for the measurement scripts: a preview server and a browser.

import { spawn } from "node:child_process";
import { chromium } from "playwright";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/** Starts `astro preview` on `port` and resolves once it is answering. */
export function startPreview(port) {
  const child = spawn("npx", ["astro", "preview", "--port", String(port)], {
    cwd: root,
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return new Promise((resolve, reject) => {
    const give_up = setTimeout(() => reject(new Error("astro preview did not start")), 30000);
    child.stdout.on("data", (d) => {
      if (String(d).includes(String(port))) {
        clearTimeout(give_up);
        setTimeout(() => resolve(child), 400);
      }
    });
    child.on("error", reject);
  });
}

/** Playwright's own Chromium if it is downloaded, otherwise the installed Chrome. */
export async function launchBrowser() {
  try {
    return await chromium.launch();
  } catch {
    return await chromium.launch({ channel: "chrome" });
  }
}
