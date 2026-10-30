/** Browser interaction checks use a clearly isolated mock of the real captured public snapshot. */
import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
const { chromium, webkit } = await import(
  process.env.IMD_PLAYWRIGHT || "playwright"
);
import { serve } from "./browser-server.mjs";
import { ABI } from "../src/chain";
import { draw, pair, type ChainSnapshot } from "../src/reading";
import { DECK } from "../src/deck";
const snapshot: ChainSnapshot = JSON.parse(
  await readFile("public/settled-snapshot.json", "utf8"),
);
const second = "0x52908400098527886e0f7030069857d2e4169ee7";
const out = "test/scratch/browser-check";
await mkdir(out, { recursive: true });
await mkdir("docs/evidence", { recursive: true });
const server = await serve();
const report: { name: string; passed: boolean; detail?: string }[] = [];
const errors: string[] = [];
const check = async (name: string, fn: () => Promise<void>) => {
  try {
    await fn();
    report.push({ name, passed: true });
    console.log("PASS " + name);
  } catch (e) {
    report.push({ name, passed: false, detail: String(e) });
    console.log("FAIL " + name + ": " + String(e));
  }
};
const browser = await chromium.launch({ headless: true });
let context;
try {
  context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    permissions: ["clipboard-read", "clipboard-write"],
  });
  const page = await context.newPage();
  const requests: { method: string; params: unknown[] }[] = [];
  let statusRequests = 0,
    coreRequests = 0,
    offline = false;
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("response", (r) => {
    if (r.url().startsWith(server.url) && r.status() >= 400)
      errors.push(`${r.status()} ${r.url()}`);
  });
  await page.clock.install({ time: new Date("2026-10-30T15:30:00Z") });
  await page.addInitScript("globalThis.__name = (target) => target;");
  await page.addInitScript(
    ({ second }) => {
      (window as any).walletCalls = [];
      (window as any).ethereum = {
        request: async ({ method }: { method: string }) => {
          (window as any).walletCalls.push(method);
          return [second];
        },
      };
    },
    { second },
  );
  await page.route("https://api.squeekchain.com/**", async (route) => {
    if (offline) return route.abort();
    if (route.request().url().endsWith("/v1/core")) {
      coreRequests++;
      return route.fulfill({
        json: {
          identities: { core: snapshot.core },
          chain: {
            chainId: "11155111",
            deploymentBlock: String(snapshot.deploymentBlock),
          },
        },
      });
    }
    statusRequests++;
    return route.fulfill({
      json: {
        measurement: {
          freshness: "online",
          observedAt: new Date("2026-10-30T15:30:00Z").toISOString(),
          staleAfterSeconds: 120,
          coreStatus: "ACTIVE",
          rpmMilli: 40000,
          distanceMm: 1234000,
        },
      },
    });
  });
  await page.route(
    "https://ethereum-sepolia-rpc.publicnode.com/**",
    async (route) => {
      if (offline) return route.abort();
      const { method, params } = route.request().postDataJSON();
      requests.push({ method, params });
      let result: unknown;
      if (method === "eth_chainId") result = "0xaa36a7";
      else if (method === "eth_blockNumber")
        result = "0x" + (snapshot.blockNumber + 12).toString(16);
      else if (method === "eth_getBlockByNumber")
        result = { hash: snapshot.blockHash };
      else if (method === "eth_call") {
        const name = ABI.parseTransaction({ data: params[0].data })!.name;
        result =
          name === "configuration"
            ? ABI.encodeFunctionResult(name, [
                [
                  `0x${"12".repeat(32)}`,
                  BigInt(snapshot.genesisTimestamp),
                  BigInt(snapshot.roundDuration),
                  10000n,
                  16,
                  snapshot.core,
                  snapshot.core,
                  10000,
                  40n,
                  30n,
                  1000000000n,
                ],
              ])
            : ABI.encodeFunctionResult(name, [
                [
                  BigInt(snapshot.settledThroughRound),
                  BigInt(snapshot.cumulativeWork),
                  0n,
                  0n,
                  0n,
                  10000,
                  0n,
                  false,
                ],
              ]);
      } else if (method === "eth_getLogs") {
        const { fromBlock, toBlock } = params[0];
        result = snapshot.rounds
          .filter(
            (r) =>
              r.blockNumber >= Number(BigInt(fromBlock)) &&
              r.blockNumber <= Number(BigInt(toBlock)),
          )
          .map((r) => {
            const event = ABI.encodeEventLog(ABI.getEvent("RoundRecorded")!, [
              r.roundId,
              r.work,
              0n,
              0n,
              0,
              r.dataHash,
            ]);
            return {
              ...event,
              transactionHash: r.transactionHash,
              blockNumber: "0x" + r.blockNumber.toString(16),
              removed: false,
            };
          });
      } else throw new Error("Unexpected wallet/RPC method: " + method);
      return route.fulfill({ json: { jsonrpc: "2.0", id: 1, result } });
    },
  );
  await page.goto(server.url);
  await page
    .getByRole("heading", { name: "The Night Shift", exact: true })
    .waitFor();
  await page
    .getByText("Reading from Ethereum Sepolia", { exact: false })
    .waitFor();
  await check(
    "390px landing shows real reading and primary action on first screen",
    async () => {
      assert.equal(await page.locator("#draw-address").inputValue(), "");
      const box = await page
        .getByRole("button", { name: "Draw my card" })
        .boundingBox();
      assert.ok(box && box.y + box.height <= 844, JSON.stringify(box));
      assert.ok(await page.getByText("40.0 rpm").isVisible());
      await page.screenshot({ path: `${out}/landing-390.png` });
      await page.screenshot({
        path: "docs/evidence/landing-390.jpg",
        type: "jpeg",
        quality: 82,
      });
      console.log("Primary action bounds: " + JSON.stringify(box));
    },
  );
  await check(
    "inline address validation focuses the invalid field",
    async () => {
      await page.locator("#draw-address").fill("not an address");
      await page.getByRole("button", { name: "Draw my card" }).click();
      assert.equal(
        await page.locator("#draw-address").getAttribute("aria-invalid"),
        "true",
      );
      assert.ok(
        await page
          .locator("#draw-address")
          .evaluate((el) => el === document.activeElement),
      );
      assert.match(
        await page.locator("#address-error").innerText(),
        /42 characters/,
      );
    },
  );
  await check(
    "optional wallet only requests accounts and fills the field",
    async () => {
      await page
        .getByRole("button", { name: "Use wallet", exact: true })
        .click();
      await page.getByText("Address filled.", { exact: false }).waitFor();
      assert.equal(await page.locator("#draw-address").inputValue(), second);
      assert.deepEqual(await page.evaluate(() => (window as any).walletCalls), [
        "eth_requestAccounts",
      ]);
      await page.evaluate(() => {
        (window as any).ethereum.request = async () => {
          throw Object.assign(new Error("Rejected"), { code: 4001 });
        };
      });
      await page
        .getByRole("button", { name: "Use wallet", exact: true })
        .click();
      await page.getByText("Request cancelled.", { exact: false }).waitFor();
    },
  );
  await check(
    "keyboard form submission creates an address/date permalink",
    async () => {
      await page.locator("#draw-address").fill(snapshot.core);
      await page.locator("#draw-date").fill("2026-10-30");
      await page.locator("#draw-address").press("Enter");
      await page
        .getByRole("heading", { name: "Draw another", exact: true })
        .waitFor();
      const url = new URL(page.url());
      assert.equal(url.searchParams.get("a"), snapshot.core);
      assert.equal(url.searchParams.get("d"), "2026-10-30");
      assert.ok(
        await page
          .locator("#reading-top")
          .evaluate((el) => el === document.activeElement),
      );
    },
  );
  await check(
    "proof reveals full hash, seed, settlement link and all arithmetic",
    async () => {
      await page.locator("#draw-proof > summary").click();
      const r = draw(snapshot.core, "2026-10-30", snapshot),
        text = await page.locator("#draw-proof").innerText();
      for (const fragment of [
        r.anchor.dataHash,
        r.seed,
        "seed >> 64",
        "seed >> 128",
        "12474",
        "bytes32",
      ])
        assert.ok(text.includes(fragment), fragment);
      const tx = page.locator('#draw-proof a[href*="/tx/"]');
      assert.equal(
        await tx.getAttribute("href"),
        `https://sepolia.etherscan.io/tx/${r.anchor.transactionHash}`,
      );
      assert.equal(await page.locator(".colour-key li").count(), 12);
      await page.locator("#draw-proof > summary").click();
    },
  );
  await check("Save image downloads an actual 1080x1350 PNG", async () => {
    const downloaded = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save image", exact: true }).click();
    const download = await downloaded;
    assert.match(download.suggestedFilename(), /squeekscope-2026-10-30.*\.png/);
    await download.saveAs(`${out}/reading.png`);
    const png = await readFile(`${out}/reading.png`);
    assert.equal(png.subarray(1, 4).toString(), "PNG");
    assert.equal(png.readUInt32BE(16), 1080);
    assert.equal(png.readUInt32BE(20), 1350);
    assert.ok(png.length > 10000);
  });
  await check("copy and X sharing include the current permalink", async () => {
    await page.getByRole("button", { name: "Copy link", exact: true }).click();
    assert.equal(
      await page.evaluate(() => navigator.clipboard.readText()),
      page.url(),
    );
    const href = await page
      .getByRole("link", { name: "Post on X", exact: false })
      .getAttribute("href");
    const intent = new URL(href!);
    assert.equal(intent.hostname, "twitter.com");
    assert.equal(intent.searchParams.get("url"), page.url());
  });
  await check(
    "pair reading persists b, displays exact score and symmetric shared round",
    async () => {
      await page.locator("#pair-address").fill(second);
      await page
        .getByRole("button", { name: "Read our pair", exact: false })
        .click();
      await page.locator(".pair-result").waitFor();
      const expected = pair(
        draw(snapshot.core, "2026-10-30", snapshot),
        draw(second, "2026-10-30", snapshot),
      );
      assert.equal(new URL(page.url()).searchParams.get("b"), second);
      assert.equal(
        await page.locator(".score-number").innerText(),
        `${expected.score}/100`,
      );
      assert.ok(
        (await page.locator(".pair-score").innerText()).includes(
          "#" + expected.sharedRound.toLocaleString("en-GB"),
        ),
      );
      await page.locator(".pair-math > summary").click();
      assert.ok(
        (await page.locator(".pair-math").innerText()).includes(expected.hash),
      );
      await page.screenshot({ path: `${out}/pair-390.png`, fullPage: true });
      await page.locator(".pair-math > summary").click();
      await page.evaluate(() => {
        (document.activeElement as HTMLElement)?.blur();
        const top = document.querySelector(".pair-section")!.getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, top - 16);
      });
      await page.screenshot({
        path: "docs/evidence/pair-390.jpg",
        type: "jpeg",
        quality: 82,
      });
    },
  );
  await check(
    "week navigation preserves subject and pair; browser back restores date",
    async () => {
      assert.equal(await page.locator(".week-card").count(), 7);
      assert.equal(await page.locator(".week-card.face-down").count(), 3);
      await page.locator('.week-card[href*="d=2026-10-28"]').click();
      assert.equal(new URL(page.url()).searchParams.get("d"), "2026-10-28");
      assert.equal(new URL(page.url()).searchParams.get("b"), second);
      assert.equal(await page.locator("#card-name").innerText(), "The Block");
      await page.goBack();
      await page
        .getByRole("heading", { name: "The Night Shift", exact: true })
        .waitFor();
      await page
        .getByRole("button", { name: "Remove pair", exact: true })
        .click();
      assert.equal(new URL(page.url()).searchParams.has("b"), false);
    },
  );
  await check(
    "polling uses 15s mood and 90s chain intervals without wall-clock waiting",
    async () => {
      const beforeStatus = statusRequests,
        beforeCore = coreRequests;
      await page.clock.fastForward(15000);
      await page.waitForFunction(() =>
        document.querySelector(".mood-title")?.textContent?.includes("awake"),
      );
      assert.ok(statusRequests > beforeStatus);
      assert.equal(coreRequests, beforeCore);
      await page.clock.fastForward(75000);
      await page
        .getByText("Reading from Ethereum Sepolia", { exact: false })
        .waitFor();
      assert.ok(coreRequests > beforeCore);
    },
  );
  await check(
    "phone, tablet and desktop reading/proof layouts reflow without horizontal scroll",
    async () => {
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const open of [false, true]) {
          await page.locator("#draw-proof").evaluate((el, open) => {
            (el as HTMLDetailsElement).open = open;
          }, open);
          const dimensions = await page.evaluate(() => ({
            scroll: document.documentElement.scrollWidth,
            client: document.documentElement.clientWidth,
          }));
          assert.ok(
            dimensions.scroll <= dimensions.client,
            JSON.stringify({ width, open, ...dimensions }),
          );
        }
        await page
          .locator("#draw-proof")
          .evaluate((el) => ((el as HTMLDetailsElement).open = false));
        await page.evaluate(() => window.scrollTo(0, 0));
        await page.screenshot({
          path: `${out}/reading-${width}.png`,
          fullPage: width === 1440,
        });
        if (width === 1440)
          await page.screenshot({
            path: "docs/evidence/reading-1440.jpg",
            type: "jpeg",
            quality: 82,
          });
      }
    },
  );
  await check(
    "deck gallery contains all 22 locally loaded illustrations and both readings",
    async () => {
      await page.getByRole("link", { name: "The deck", exact: false }).click();
      await page
        .getByRole("heading", { name: "A pocket-sized cosmos.", exact: true })
        .waitFor();
      assert.ok(new URL(page.url()).searchParams.has("deck"));
      assert.equal(await page.locator(".deck-card").count(), 22);
      assert.equal(await page.locator(".deck-card strong").count(), 44);
      for (const img of await page.locator(".deck-card img").all()) {
        await img.scrollIntoViewIfNeeded();
        await img.evaluate(async (el) => {
          await (el as HTMLImageElement).decode();
        });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: `${out}/deck-390.png`, fullPage: true });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.screenshot({ path: `${out}/deck-1440.png`, fullPage: true });
      await page.screenshot({
        path: "docs/evidence/deck-1440.jpg",
        type: "jpeg",
        quality: 82,
      });
      for (const width of [320, 390, 1440]) {
        await page.setViewportSize({ width, height: 844 });
        assert.ok(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth,
          ),
        );
      }
      assert.ok(
        await page
          .getByRole("link", { name: "Read today’s card", exact: true })
          .isVisible(),
      );
    },
  );
  await check(
    "future cards are provisional and genesis day reports absent round 1 honestly",
    async () => {
      await page.goto(`${server.url}?a=${snapshot.core}&d=2026-10-31`);
      await page.locator("#card-name").waitFor();
      assert.equal(
        await page.locator(".settlement-badge").innerText(),
        "Provisional",
      );
      await page.goto(`${server.url}?a=${snapshot.core}&d=2026-10-26`);
      await page
        .getByRole("heading", { name: "No recorded anchor.", exact: true })
        .waitFor();
      assert.ok(
        (await page.locator(".empty-reading").innerText()).includes(
          "Round 1 has no recorded event",
        ),
      );
      await page.goto(`${server.url}?a=0xBAD&d=2026-10-30`);
      await page
        .getByRole("heading", { name: "Check the address.", exact: true })
        .waitFor();
    },
  );
  await check(
    "offline RPC/API failure keeps a genuine, explicitly dated snapshot and working draws",
    async () => {
      offline = true;
      await page.goto(`${server.url}?a=${snapshot.core}&d=2026-10-30`);
      await page
        .getByRole("heading", { name: "The Night Shift", exact: true })
        .waitFor();
      await page.clock.fastForward(5000);
      await page
        .getByText("Showing the last complete chain snapshot.", {
          exact: false,
        })
        .waitFor();
      assert.ok(
        (await page.locator(".data-status").innerText()).includes("Snapshot"),
      );
      assert.equal(
        await page.locator("#card-name").innerText(),
        "The Night Shift",
      );
      offline = false;
      await page
        .getByRole("button", { name: "Refresh data", exact: true })
        .click();
      await page
        .getByText("Reading from Ethereum Sepolia", { exact: false })
        .waitFor();
    },
  );
  await check(
    "all 22 card faces remain usable at 390px, including longest names",
    async () => {
      const addresses = new Map<number, string>();
      for (let i = 1; i <= 400 && addresses.size < 22; i++) {
        const a = "0x" + i.toString(16).padStart(40, "0");
        addresses.set(draw(a, "2026-10-30", snapshot).index, a);
      }
      assert.equal(addresses.size, 22);
      await page.setViewportSize({ width: 390, height: 844 });
      for (const [index, address] of addresses) {
        await page.goto(`${server.url}?a=${address}&d=2026-10-30`);
        await page
          .getByRole("heading", { name: DECK[index].name, exact: true })
          .waitFor();
        assert.ok(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth <=
              document.documentElement.clientWidth,
          ),
        );
      }
    },
  );
  await check(
    "network and page stay free of signing/transaction methods and uncaught errors",
    async () => {
      assert.equal(errors.length, 0, errors.join("\n"));
      assert.ok(requests.length > 0);
      const methods = [...new Set(requests.map((r) => r.method))];
      assert.deepEqual(
        methods.sort(),
        [
          "eth_blockNumber",
          "eth_call",
          "eth_chainId",
          "eth_getBlockByNumber",
          "eth_getLogs",
        ].sort(),
      );
    },
  );
  await context.close();
  context = undefined;
  try {
    const safari = await webkit.launch({ headless: true });
    try {
      const p = await safari.newPage({ viewport: { width: 390, height: 844 } });
      await p.route("https://**/*", (r) => r.abort());
      await p.goto(`${server.url}?a=${snapshot.core}&d=2026-10-30`);
      await p
        .getByRole("heading", { name: "The Night Shift", exact: true })
        .waitFor();
      assert.ok(
        await p.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      );
      await p.screenshot({ path: `${out}/webkit-390.png` });
      report.push({ name: "WebKit initial reading and reflow", passed: true });
    } finally {
      await safari.close();
    }
  } catch (e) {
    report.push({
      name: "WebKit availability",
      passed: false,
      detail: String(e),
    });
    console.log("WebKit unavailable: " + String(e));
  }
} finally {
  if (context) await context.close();
  await browser.close();
  await server.close();
  await writeFile(
    `${out}/results.json`,
    JSON.stringify({ report, errors }, null, 2),
  );
}
const failures = report.filter(
  (r) => !r.passed && !r.name.includes("availability"),
);
console.log(
  JSON.stringify(
    {
      passed: report.filter((r) => r.passed).length,
      failures: failures.length,
      limitations: report
        .filter((r) => !r.passed && r.name.includes("availability"))
        .map((r) => r.detail),
    },
    null,
    2,
  ),
);
if (failures.length) process.exitCode = 1;
