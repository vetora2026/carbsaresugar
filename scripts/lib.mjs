// Shared plumbing for the measurement scripts: a preview server and a browser.

import { spawn, spawnSync } from "node:child_process";
import { chromium } from "playwright";

const root = new URL("..", import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1");

/**
 * Refuses to measure against somebody else's server. A leftover `astro
 * preview` from an earlier run listens on ::1 while a fresh server binds
 * 127.0.0.1; Chromium resolves localhost to ::1 first on Windows, so the
 * measurement silently reads the stale build and looks healthy. Both
 * measurement scripts call this before they start anything.
 */
export async function assertPortFree(port) {
  const { createServer } = await import("node:net");
  for (const host of ["127.0.0.1", "::1"]) {
    await new Promise((resolve, reject) => {
      const probe = createServer();
      probe.once("error", (err) =>
        reject(
          err.code === "EADDRINUSE"
            ? new Error(`port ${port} is already in use on ${host}: close the stale server first`)
            : err,
        ),
      );
      probe.listen(port, host, () => probe.close(resolve));
    });
  }
}

/** Starts `astro preview` on `port` and resolves once it is answering. */
export function startPreview(port) {
  const child = spawn("npx", ["astro", "preview", "--port", String(port), "--host", "127.0.0.1"], {
    cwd: root,
    shell: process.platform === "win32",
    stdio: ["ignore", "pipe", "pipe"],
  });
  // `shell: true` on Windows puts cmd.exe between us and node, and killing the
  // shell leaves the server holding the port. Take the whole tree down.
  const kill = () => {
    if (process.platform === "win32") {
      // Synchronous: the script calls process.exit right afterwards, and an
      // async taskkill would be killed with it, leaving the port held.
      try {
        spawnSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], { stdio: "ignore" });
      } catch {}
    }
    child.kill();
  };
  return new Promise((resolve, reject) => {
    const give_up = setTimeout(() => reject(new Error("astro preview did not start")), 30000);
    child.stdout.on("data", (d) => {
      if (String(d).includes(String(port))) {
        clearTimeout(give_up);
        setTimeout(() => resolve({ kill }), 400);
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

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
};

/**
 * Serves `dir` on `port`, the same way `astro preview` serves dist: directory
 * paths get index.html. Used for the doctored copy of the build that the
 * --no-local-fallbacks measurement loads.
 */
export async function startStatic(port, dir) {
  const { createServer } = await import("node:http");
  const { readFile } = await import("node:fs/promises");
  const { join, extname, normalize } = await import("node:path");

  const server = createServer(async (req, res) => {
    let pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    const file = join(dir, normalize(pathname).replace(/^(\.\.[\/])+/, ""));
    try {
      const body = await readFile(file);
      res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" });
      res.end(body);
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("not found");
    }
  });
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", resolve);
  });
  return { kill: () => server.close() };
}

/**
 * Copies dist/ to `dest` with every `local(...)` source in the stylesheets
 * pointed at a font no machine has. That is the Android and Linux case: the
 * metric-matched fallback faces name fonts that are simply not installed
 * there, so the browser falls through to whatever the platform's default is,
 * with no size adjustment at all.
 *
 * Every `local()` goes rather than a list of font names, because capsize
 * writes several aliases per font (Arial and ArialMT, Roboto Regular and
 * Roboto-Regular). The web fonts themselves are loaded by url() and are not
 * touched.
 */
export async function copyWithoutLocalFonts(src, dest) {
  const { cp, readdir, readFile, writeFile, rm } = await import("node:fs/promises");
  const { join, extname } = await import("node:path");

  await rm(dest, { recursive: true, force: true });
  await cp(src, dest, { recursive: true });

  const pattern = /local\(\s*(["']?)[^)"']*\1\s*\)/gi;
  let patched = 0;
  const walk = async (dir) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if ([".html", ".css"].includes(extname(entry.name))) {
        const text = await readFile(full, "utf8");
        const next = text.replace(pattern, 'local("NoSuchFont")');
        if (next !== text) {
          await writeFile(full, next);
          patched += 1;
        }
      }
    }
  };
  await walk(dest);
  return patched;
}
