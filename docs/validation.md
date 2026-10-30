# Squeekscope local validation

Reviewed on 30 October 2026. This is the implementation worker's record of local checks, not independent certification.

## Result and scope

The static browser implementation is complete and usable: landing, address/date reading, full draw proof, seven-day history, pairing, gallery, PNG download and share links. Build, typecheck, 16 calculation tests, 16 Chromium interaction groups, four axe audits and all 16 pinned design-probe checks passed. A real-data limitation remains: the live deployment has no recorded round 1, so its 26 October card cannot be computed honestly. It is explicitly unavailable. No placeholder reading was shipped.

One visual idea carries the website: an ivory almanac of engraved hamster cards, with black ink, oxblood actions and flat gold details. Screenshots below come from the production export served under `/preview/`. The landing/desktop/gallery interaction screenshots use an explicitly mocked status/chain transport backed by the real captured snapshot; the live mood values in those screenshots are test fixtures, not a claim about the hamster at capture time. The pair screenshot uses the stored real snapshot with external requests disabled. The pinned probe also reached the real API/RPC.

## Brief coverage

| Requirement | Status and evidence |
| --- | --- |
| Browser-only static site, no backend/keys/signatures/transactions | Implemented. Only five read RPC methods are used. The only wallet request is optional `eth_requestAccounts`; tested success and rejection. |
| Live Core identity, supplied fallback, deployment log scan and refresh | Implemented. `src/chain.ts`; real capture and live design probe. At most 45,000-block ranges, bounded retry/subdivision, canonical block check and work reconciliation. |
| 15-second mood, independent of card | Implemented. Mocked virtual-clock test confirms 15s mood and 90s chain schedules; mood failure leaves reading intact. |
| Exact daily seed, card, orientation, lucky values, energy and provisional rule | Implemented. 16 pure tests, real known vectors, byte-for-byte packed-input check and 500-address coverage. All math is bigint. |
| 22 named cards, original SVG art, both readings and omen | Implemented in fixed order. All 22 images decoded in Chromium; gallery inspected across all rows. |
| Home reads today's Core card, then offers a draw form | Implemented. 390 × 844 button bounds: x=195.33, y=769.39, width=160.67, height=47; bottom=816.39 px. |
| Permalink and full audit panel | Implemented. Exact subject, UTC day, round timing, anchor, dataHash, transaction link, seed, arithmetic and sources validated. |
| Seven UTC days ending on selected day | Implemented. Navigation preserves addresses; browser Back restores date. Prelaunch days stay face down. The missing genesis anchor is separately labelled. |
| Pair, distance, score and shared hash | Implemented. Symmetry, identical-card score, opposite-card boundary, both orientations and sorted-byte hashing tested. |
| Shared-round mapping | Explicit interpretation: `firstRound + uint256(sortedSeedHash) mod 144`. The brief omits a range; this convention is visible in the pair proof and README. |
| Gallery at `?deck` | Implemented. 22 illustrations and 44 interpretation labels; real return navigation. |
| Local 1080 × 1350 PNG and X intent | Implemented. Download bytes have PNG signature and exact IHDR dimensions; clipboard and tweet URL contain current permalink. |
| Ivory, ink, oxblood, flat gold; phone layout | Implemented and visually reviewed. No horizontal scroll at 320, 390, 768 or 1440; 200% text enlargement reflows. |
| Required footer attribution | Implemented and linked to squeekchain.com. |
| Static dist, source, lockfile and metadata | Included. Relative runtime asset URLs, query routing, real favicon/1200 × 630 OG PNG, title and descriptions. |
| Documentation and six-domain review | README, DESIGN and this record describe the final implementation and actual checks. |

## Better Interface coverage

The pinned workflow and core principles of all six domains were read during construction. Supporting keyboard/forms, typography, palette, responsive layout and documentation sections were used where applicable.

| Domain | Coverage | Evidence and limitations |
| --- | --- | --- |
| Accessibility | Checked | Native controls/disclosures/dialog, labelled fields, live error/status regions, first-invalid-field focus, keyboard Enter submission and visible 2 px focus outline. Four axe WCAG A/AA audits reported zero violations (28, 28, 18 and 26 passed rules). Focus and forced-colors screenshots were inspected. No screen-reader or physical-device session; multiple-extension modal was source-reviewed, not tested with actual extensions. |
| Layout | Checked | Production export at 320/390/768/1440, closed/open proof, all 22 card faces at 390, pair and full gallery. No document horizontal overflow. First-screen product and draw action confirmed on the 390 screenshot. At 200% root text size, 390 px client width equals 390 px scroll width. Browser-native zoom, RTL and physical phones were not tested. |
| Writing | Checked | Short product headline, adjacent field instructions, verb-led actions, genuine pending/failed/cached/provisional states, specific anchor failure. Gallery contains both original readings and an omen. No invented mood or substituted anchor. |
| Typography | Checked | Local Fraunces/DM Sans, two used weights, three UI families including data mono, six-token scale. Inputs 16 px; hashes and addresses remain selectable and wrap in the proof. Tested long card names and 200% text. No non-Latin/localized content is claimed. |
| Colors | Checked | Actual CSS token pairs measured: ink/page 13.54:1; muted/page 5.25:1; accent/page and primary-fill text 8.31:1; muted/subtle 4.72:1; ink/field 14.54:1. Probe text contrast passes. Named colour dots and explicit status text avoid colour-only meaning. No dark theme is part of the brief. |
| UI | Checked | Flat structural rules, consistent fields/buttons, hover/active/disabled/focus states in source, pending wallet/save and error/offline states exercised. Reduced-motion probe passed; no endless animation or autoplay. Native modal is used for optional multi-provider selection. Real wallet extensions and Safari were unavailable. |

## Findings corrected

Source locations below refer to the final source; each points to the corrected component or rule.

| Severity/domain | Source and reproduced problem | Correction and recheck |
| --- | --- | --- |
| High / Layout | `src/style.css:1144`: the initial 390 px draw button ended at y=869.58, beyond the 844 px first screen. | Reduced phone chrome/group spacing; gave art and text a compact wrapping layout. The final browser check measures the complete button ending at 816.39 px; screenshot inspected. |
| Medium / Accessibility and Layout | `src/style.css:1211`, `src/style.css:1291`, `src/style.css:1355`: 200% text made the initial header/form/week arrangement extend the 390 px document to 457 px, then exposed a long week-name overflow. | Header/form flex wrap, em-based reading copy/date widths, auto-fitting week columns and wrapping names. Final enlarged-text scroll width is exactly 390 px. |
| High / Data integrity | `src/chain.ts:50`, `src/chain.ts:111`, `src/chain.ts:216`: live historical range requests intermittently answered `pruned history unavailable`. | Bounded retries and range subdivision recovered the complete 98-event history; its 45,957 work matches the pinned contract state. Incomplete or duplicate histories are rejected, retaining an explicitly dated snapshot. Offline/retry and live endpoint checks passed. |
| Medium / Writing and correctness | `src/reading.ts:93`, `src/main.tsx:674`: round 1 is absent from the actual settled event history, making the genesis exception unavailable. A generic retry message did not explain the permanent gap in the available evidence. | Specific missing-event explanation and a separate “No anchor” week label; the later-day recovery is stated. Missing-anchor browser test and a separate positive genesis-fixture test pass. The external data gap itself remains. |
| Low / UI | `src/main.tsx:1146`: an early gallery iteration added a selection outline that did not reveal additional reading content. | Removed the unnecessary selection controls; all cards and readings are visible and the utility navigates back to today's reading. Gallery navigation and image decode tests pass. |

There are no remaining reproduced source-level blockers in the reviewed flows. The genesis data gap and unperformed browser/device checks are not presented as passes.

## Commands and actual results

```sh
npm run typecheck
npm test
npm run build
IMD_PLAYWRIGHT=/opt/imd-tools/playwright-mcp/node_modules/playwright/index.mjs PLAYWRIGHT_BROWSERS_PATH=/opt/imd-tools/ms-playwright npm run test:browser
IMD_PLAYWRIGHT=/opt/imd-tools/playwright-mcp/node_modules/playwright/index.mjs PLAYWRIGHT_BROWSERS_PATH=/opt/imd-tools/ms-playwright npm run test:a11y
IMD_PLAYWRIGHT=/opt/imd-tools/playwright-mcp/node_modules/playwright/index.mjs PLAYWRIGHT_BROWSERS_PATH=/opt/imd-tools/ms-playwright node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste
```

All final commands exited 0. The browser suite recorded 16 passing groups and a separate WebKit-unavailable limitation. Its clean-page check observed zero uncaught script errors and zero missing local resources. Captured RPC methods were only `eth_chainId`, `eth_blockNumber`, `eth_getBlockByNumber`, `eth_call` and `eth_getLogs`.

The pinned `taste@1` checks all passed: render, layout, targets, contrast, casing, tracking, eyebrows, type sizes, type faces, glyphs, slogans, repetition, copy budget, chrome, motion and share metadata. It measured 19 phone controls, all at least 24 px or sufficiently spaced; three are below the 44 px comfort recommendation. The first phone screen contained 35 prose words, below its 60-word bar. It found no overlaps, clipping, floating controls over text, missing local resources or script errors. Its screenshots were viewed as part of the review.

The browser PNG download was inspected visually and as bytes. All 22 illustrations were viewed in the full gallery; the share image and selected final screenshots were also inspected. Raw local reports, screenshots, the sample download and test scaffolding reside in excluded `test/scratch/`; the compact report and selected evidence below are delivered.

## Delivered visual evidence

- [390 px landing](evidence/landing-390.jpg): full card and primary action in the first viewport.
- [1440 px reading](evidence/reading-1440.jpg): desktop composition and form.
- [1440 px deck](evidence/deck-1440.jpg): gallery and both readings.
- [390 px pair](evidence/pair-390.jpg): two card faces, score and the arithmetic disclosure.

## Chain provenance and limits

Public sources: [Core API](https://api.squeekchain.com/v1/core), [Sepolia RPC](https://ethereum-sepolia-rpc.publicnode.com), [mood API](https://api.squeekchain.com/v1/status), [ABI/API documentation](https://docs.squeekchain.com/llms-full.txt).

The bundled complete snapshot is pinned to Sepolia block 12027498, captured 2026-10-30T15:16:46.687Z, with 98 active events, 45,957 work and settlement through round 584. The Core's 30 October vector is The Night Shift, upright: firstRound 494, anchor 493, lucky round 530, colour index 0 and energy 12,474. Its settlement transaction is [0x1e6e…c0e3a4](https://sepolia.etherscan.io/tx/0x1e6e788187cec7da5c0210ce3e4551bd71537c127f74d2c1e4f32fe021c0e3a4). The seed is regression-tested, including manual 62-byte input construction.

The real 26 October genesis card is unavailable because there is no recorded round-1 hash/transaction. A newer snapshot cannot fabricate that evidence. The floor formula is preserved: that day's firstRound is −82 because genesis is at 13:50 UTC; the exception changes only its anchor. Synthetic test fixtures exercise the exception when a real round-1 event would be present.

The provided browser connector failed with `Transport closed`. Direct installed Playwright Chromium provided the browser checks. WebKit launch was attempted but no executable was available; Safari is unverified. No actual wallet extension, phone, screen reader, native 200% browser zoom, localization or RTL session was performed. Future fresh data depends on public endpoint availability/CORS and can differ from the bundled snapshot. The public RPC's intermittent pruned-range error was actually observed and handled; continued service availability is not guaranteed.

## Packaging

The source, lockfile, export, local assets, documentation and selected screenshots total less than 1.6 MiB as submission candidates, below the 8 MiB limit. All 22 public/dist SVG pairs match. Every local HTML/CSS asset reference resolves, the OG PNG is 1200 × 630, and the final production tree is byte-for-byte identical to the browser-tested export. Generated dependencies/caches and `test/scratch/` are excluded.
