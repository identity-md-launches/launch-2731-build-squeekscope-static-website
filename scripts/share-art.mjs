const { chromium } = await import(process.env.IMD_PLAYWRIGHT || "playwright");
import { readFile } from "node:fs/promises";
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({
    viewport: { width: 1200, height: 630 },
    deviceScaleFactor: 1,
  });
  await page.setContent(
    `<html><body style="margin:0">${await readFile("public/og-image.svg", "utf8")}</body></html>`,
  );
  await page.screenshot({ path: "public/og-image.png" });
  console.log("Rendered public/og-image.png (1200 × 630).");
} finally {
  await browser.close();
}
