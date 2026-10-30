import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
const mime = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".json": "application/json",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
};
export async function serve() {
  const root = resolve("dist");
  const server = createServer(async (req, res) => {
    const url = new URL(req.url, "http://localhost");
    if (!url.pathname.startsWith("/preview/")) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    const file = resolve(
      root,
      decodeURIComponent(
        url.pathname.slice("/preview/".length) || "index.html",
      ),
    );
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      if (!(await stat(file)).isFile()) throw new Error();
      res.setHeader(
        "Content-Type",
        mime[extname(file)] || "application/octet-stream",
      );
      res.end(await readFile(file));
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = server.address().port;
  return {
    server,
    url: `http://127.0.0.1:${port}/preview/`,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
