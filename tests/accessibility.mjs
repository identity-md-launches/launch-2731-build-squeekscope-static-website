import { readFile, mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
import { serve } from "./browser-server.mjs";
const { chromium } = await import(process.env.IMD_PLAYWRIGHT || "playwright");
const snapshot = JSON.parse(
  await readFile("public/settled-snapshot.json", "utf8"),
);
const out = "test/scratch/accessibility";
await mkdir(out, { recursive: true });
const server = await serve(),
  browser = await chromium.launch({ headless: true });
const results = [];
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.route("https://**/*", (r) => r.abort());
  for (const query of [
    `?a=${snapshot.core}&d=2026-10-30`,
    `?a=${snapshot.core}&d=2026-10-30&b=${snapshot.core}`,
    "?deck",
    `?a=invalid&d=2026-10-30`,
  ]) {
    await page.goto(server.url + query);
    await page.waitForSelector(".reading-section,.deck-grid,.empty-reading");
    await page.addScriptTag({ path: "node_modules/axe-core/axe.min.js" });
    if (query.includes("&b=")) await page.locator(".pair-result").waitFor();
    if (query.startsWith("?a=") && !query.includes("invalid"))
      await page.locator("#draw-proof").evaluate((el) => {
        el.open = true;
      });
    const audit = await page.evaluate(
      async () =>
        await axe.run(document, {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
          },
        }),
    );
    results.push({
      query,
      violations: audit.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        nodes: v.nodes.map((n) => ({
          target: n.target,
          summary: n.failureSummary,
        })),
      })),
      passes: audit.passes.length,
    });
  }
  await page.goto(server.url + `?a=${snapshot.core}&d=2026-10-30`);
  await page.locator("#card-name").waitFor();
  await page.locator("#draw-address").focus();
  await page.keyboard.press("Tab");
  const focus = await page.evaluate(() => {
    const el = document.activeElement,
      s = getComputedStyle(el);
    return {
      tag: el.tagName,
      id: el.id,
      style: s.outlineStyle,
      width: s.outlineWidth,
      color: s.outlineColor,
    };
  });
  assert.equal(focus.style, "solid");
  assert.equal(focus.width, "2px");
  await page.screenshot({ path: `${out}/keyboard-focus.png` });
  await page.emulateMedia({ forcedColors: "active" });
  await page.screenshot({ path: `${out}/forced-colors.png` });
  await page.emulateMedia({ forcedColors: "none" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  const resize = await page.evaluate(() => ({
    width: document.documentElement.clientWidth,
    scroll: document.documentElement.scrollWidth,
  }));
  if (resize.scroll > resize.width)
    console.log(
      await page.evaluate(() =>
        [...document.querySelectorAll("body *")]
          .filter(
            (el) =>
              el.getBoundingClientRect().right >
              document.documentElement.clientWidth + 1,
          )
          .slice(0, 15)
          .map((el) => ({
            tag: el.tagName,
            class: el.className,
            text: el.textContent.slice(0, 100),
            width: el.getBoundingClientRect().width,
            right: el.getBoundingClientRect().right,
          })),
      ),
    );
  await page.screenshot({ path: `${out}/text-200percent.png`, fullPage: true });
  assert.ok(resize.scroll <= resize.width, JSON.stringify(resize));
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "";
  });
  const palette = await page.evaluate(() => {
    const s = getComputedStyle(document.documentElement);
    return {
      paper: s.getPropertyValue("--ivory").trim(),
      subtle: s.getPropertyValue("--ivory-deep").trim(),
      field: s.getPropertyValue("--paper-light").trim(),
      ink: s.getPropertyValue("--black").trim(),
      muted: s.getPropertyValue("--grey").trim(),
      accent: s.getPropertyValue("--oxblood").trim(),
    };
  });
  const luminance = (hex) => {
    const x = hex
      .slice(1)
      .match(/../g)
      .map((v) => parseInt(v, 16) / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return x[0] * 0.2126 + x[1] * 0.7152 + x[2] * 0.0722;
  };
  const contrast = (a, b) => {
    const x = [luminance(a), luminance(b)].sort((a, b) => b - a);
    return Number(((x[0] + 0.05) / (x[1] + 0.05)).toFixed(2));
  };
  const ratios = Object.fromEntries(
    [
      ["ink", "paper"],
      ["muted", "paper"],
      ["accent", "paper"],
      ["muted", "subtle"],
      ["ink", "field"],
      ["paper", "accent"],
    ].map(([a, b]) => [a + "/" + b, contrast(palette[a], palette[b])]),
  );
  await writeFile(
    `${out}/results.json`,
    JSON.stringify(
      { results, focus, textResize: resize, palette, ratios },
      null,
      2,
    ),
  );
  console.log(
    JSON.stringify(
      {
        audits: results.map((r) => ({
          query: r.query,
          passes: r.passes,
          violations: r.violations,
        })),
        focus,
        textResize: resize,
        ratios,
      },
      null,
      2,
    ),
  );
  assert.equal(
    results.reduce((n, r) => n + r.violations.length, 0),
    0,
  );
} finally {
  await browser.close();
  await server.close();
}
