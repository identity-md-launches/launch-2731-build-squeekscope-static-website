# Squeekscope

A static, browser-only daily hamster tarot reading for any Ethereum address. Built with React, TypeScript and Vite. The production website is in `dist/`; it includes its fonts, 22 original SVG cards, card back, favicon, share image and a genuine dated Sepolia snapshot.

## Install, run and rebuild

Use Node 22 and npm:

```sh
npm ci
npm run dev
```

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

`npm run build` typechecks and exports the site to `dist/`. Preview serves that export over HTTP; opening `index.html` directly with a `file:` URL is not supported. Dependencies are pinned in `package-lock.json`. A rebuild uses installed dependencies and local assets; it does not fetch chain data, fonts or artwork.

Vite uses `base: './'`. All runtime assets are relative, and all navigation uses query parameters, so the export works at a static gateway subpath without server rewrites. Serve the whole `dist/` directory. Publishing and a final hosting URL are outside this implementation.

## Use the site

- Open the home page for today's complete reading for the live SqueekCore address.
- Enter an Ethereum address and, optionally, change the UTC date. `Use wallet` only fills the field after an optional `eth_requestAccounts`; it never signs, switches chains or sends a transaction. EIP-6963 wallets are discovered; multiple discovered wallets use a native dialog. Pasting an address works without a wallet.
- Share a reading with `?a=0x...&d=YYYY-MM-DD`. Add `&b=0x...` for a pair.
- Select a day in the seven-card week to open its reading. Dates before 26 October 2026 stay face down.
- Open `?deck` for all 22 illustrations, upright/reversed readings and omens.
- Expand **How this card was drawn** for the anchor, full hashes, linked settlement transaction, round clock, seed and arithmetic.
- **Save image** creates and downloads a 1080 × 1350 PNG in the browser. **Post on X** opens a tweet intent containing the permalink. Images are never uploaded.

The date defaults to today in UTC. Future dates are allowed, and are explicitly provisional. Addresses must have 40 hex digits after `0x`; mixed-case addresses must have a valid checksum.

## Public data and integrity

The only live data sources are:

- [SqueekCore identity API](https://api.squeekchain.com/v1/core): `identities.core` and `chain.deploymentBlock`.
- [Publicnode Sepolia RPC](https://ethereum-sepolia-rpc.publicnode.com): chain ID, block headers, `configuration()`, `state()` and `RoundRecorded` logs.
- [Squeekchain status API](https://api.squeekchain.com/v1/status): mood only, every 15 seconds. RPM is `rpmMilli / 1000`; kilometres today are `distanceMm / 1000000`. Stale/offline/faulted measurements display unavailable rather than an invented mood.
- [Squeekchain reference](https://docs.squeekchain.com/llms-full.txt): contract ABI and public API field definitions.

Chain data refreshes every 90 seconds. Reads pin one block 12 confirmations behind the current tip, verify Sepolia chain ID 11155111, and recheck the block hash after replay. Logs start at the deployment block in chunks of at most 45,000 blocks. Transient errors receive three bounded attempts; rejected/pruned ranges may be subdivided. Complete replayed work must equal `state().cumulativeWork`; duplicate rounds, incomplete histories and a changed block hash are rejected.

A verified cached prefix is retained only if its block hash remains canonical. Each refresh rescans a 64-block overlap. The supplied fallback deployment is `0x980b4424c007caf7a1f3670b48c8eaef7ebc3d44`, block `11998937`.

`public/settled-snapshot.json` is real captured public data, not a sample reading. It was captured at **2026-10-30T15:16:46.687Z**, block **12027498**, with **98 active rounds**, **45,957 work**, and settlement through round **584**. Browser local storage may retain a newer complete snapshot under `squeekscope:settled:v1`. The UI distinguishes a stored snapshot from a fresh RPC read, retains the last complete reading during outages, and offers a retry. Storage is optional and never contains a wallet session or a secret.

To deliberately refresh the bundled snapshot before a future release:

```sh
NODE_USE_ENV_PROXY=1 npx --no-install tsx scripts/update-snapshot.ts
npm test
npm run build
```

This maintenance command reads the public endpoints above. It is separate from build and test commands.

## Exact draw rules

All integer arithmetic uses `bigint`, including proper mathematical floor before genesis. The packed seed input is exactly 62 bytes: a 32-byte hash, 20-byte address, and 10 literal UTF-8 date bytes.

```text
dayKey = UTC date YYYY-MM-DD
firstRound = floor((dayStart - genesisTimestamp) / roundDuration) + 1
anchor = last round with work > 0 and roundId < firstRound
  (the genesis day borrows round 1)
seed = keccak256(abi.encodePacked(bytes32 anchor.dataHash, address subject, string dayKey))
card = seed mod 22
reversed = top bit of seed
luckyRound = firstRound + ((seed >> 64) mod 144)
colour = (seed >> 128) mod 12
energy = total work in rounds firstRound-144 to firstRound-1
provisional = settledThroughRound < firstRound-1
```

The deck order is fixed in `src/deck.ts`, beginning with The Hamster at index 0 and ending with The Hoard at index 21. Settled rounds with no active event contribute zero energy; unsettled rounds remain unknown, so a provisional energy value is the known subtotal.

| Index | Lucky colour | Hex |
| --- | --- | --- |
| 0 | Sunflower gold | `#bd8b2d` |
| 1 | Oxblood | `#742f36` |
| 2 | Bedding ivory | `#efe3ca` |
| 3 | Midnight blue | `#283953` |
| 4 | Moss green | `#596a43` |
| 5 | Clay red | `#a2583f` |
| 6 | Lavender | `#a39aba` |
| 7 | Wheel silver | `#9a9e9e` |
| 8 | Seed brown | `#745339` |
| 9 | Rose pink | `#ca9292` |
| 10 | Water blue | `#7cabb8` |
| 11 | Ink black | `#25241f` |

For a pair, `distance = min(abs(indexA-indexB), 22-abs(indexA-indexB))` and `score = (11-distance)*8 + (sameOrientation ? 12 : 0)`. Seeds are sorted by numeric value and packed as two `bytes32` values before hashing. The brief does not specify a shared-round range; this site's explicit convention is:

```text
sharedHash = keccak256(abi.encodePacked(bytes32 lowSeed, bytes32 highSeed))
sharedRound = firstRound + (uint256(sharedHash) mod 144)
```

The pair proof discloses that convention, both seeds, the hash, the distance and the score. Swapping the addresses preserves the score and shared round.

## Real-data limitation

The captured live deployment has no `RoundRecorded` event for round 1; its first active event is round 45. Therefore **26 October 2026 cannot currently be drawn using the requested genesis-day anchor**. The site explicitly explains the missing event and leaves that day face down. It does not substitute a hash, transaction, different round or different contract. The round-1 exception is implemented and tested with an explicit synthetic test fixture; real later days use the real chain history.

Public endpoints may fail or change CORS/retention policies. The dated snapshot supports useful readings during an outage, but fresh settlement and mood require those services. Future/provisional cards can change as work settles.

## Validation performed

Local checks on the final source/export:

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm test` | 16 tests passed; includes real-chain vectors, manual packed bytes, genesis floor, settlement thresholds, interval endpoints, pair symmetry and 500 address cases |
| `npm run build` | Passed; static production export produced |
| `npm run test:browser` | 16 Chromium interaction checks passed on the export served under `/preview/` |
| `npm run test:a11y` | Four axe audits; zero reported violations; visible focus, forced colors and 200% text enlargement checked |
| Pinned `taste@1` probe | All 16 checks passed at 320, 390 and 1440, including reduced motion |

The browser tests use an isolated mock based on the captured public snapshot for deterministic interaction coverage. The design probe also loaded the actual public endpoints. Browser checks cover wallet success/rejection, keyboard submission, invalid input, exact proof values, real PNG bytes/dimensions, clipboard and X URLs, pairing, history, timed refresh with a virtual clock, all 22 card faces, unavailable anchors and offline recovery. The 390 × 844 landing's draw button ends at y = **816.39 px**.

The supplied browser connector returned `Transport closed`; the installed Playwright Chromium was used directly in bounded foreground checks. WebKit was attempted but its executable was unavailable, so Safari behavior is unverified. No screen-reader, physical phone or browser-native zoom test was performed. A 200% root text-size test is documented separately from native zoom. These checks are local observations, not independent certification.

See [DESIGN.md](DESIGN.md) for implemented tokens/components and [docs/validation.md](docs/validation.md) for the six-domain review, corrections, evidence and limits.

## Source and asset map

- `src/reading.ts`: pure draw, pair, date and address rules.
- `src/chain.ts`: ABI, public reads, complete-history verification and cache handling.
- `src/deck.ts`: all 22 readings/omens and the 12 named colours.
- `src/main.tsx`: forms, readings, mood, week, pair, gallery and proof.
- `src/save-image.ts`: entirely local PNG composition and download.
- `src/style.css`: design tokens and responsive styles.
- `scripts/generate-art.mjs`: original SVG illustrations, back, favicon and share artwork; generated files are included.
- `scripts/share-art.mjs`: optional SVG-to-PNG share-image rendering using an existing Playwright module.
- `tests/`: calculation, browser and accessibility checks. `test/scratch/` holds disposable local output only.

For the browser checks in the supplied contributor environment:

```sh
IMD_PLAYWRIGHT=/opt/imd-tools/playwright-mcp/node_modules/playwright/index.mjs PLAYWRIGHT_BROWSERS_PATH=/opt/imd-tools/ms-playwright npm run test:browser
IMD_PLAYWRIGHT=/opt/imd-tools/playwright-mcp/node_modules/playwright/index.mjs PLAYWRIGHT_BROWSERS_PATH=/opt/imd-tools/ms-playwright npm run test:a11y
IMD_PLAYWRIGHT=/opt/imd-tools/playwright-mcp/node_modules/playwright/index.mjs PLAYWRIGHT_BROWSERS_PATH=/opt/imd-tools/ms-playwright node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste
```

The final command uses the pinned task input, which is removed from the submitted bundle. The other checks remain in `tests/`; outside that environment, point `IMD_PLAYWRIGHT` to an existing Playwright module and its browser installation.

The ignore-file path budget is **0 bytes** for dependency directories, npm/Vite caches, generated TypeScript metadata and `test/scratch/`, at every declared nesting level. `dist/`, the lockfile, source, fonts and illustrations are retained. No dependency archive or npm registry mirror is required.

Squeekscope is a fan project. Squeektoshi and Squeekchain belong to [squeekchain.com](https://squeekchain.com). Font licenses accompany the local fonts. Design-guidance attribution and licenses are recorded in `DESIGN.md` and `docs/design-guidance-LICENSE.txt`.
