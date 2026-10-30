import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { keccak256, toUtf8Bytes } from "ethers";
import { validSnapshot } from "../src/chain";
import { DECK, COLOURS } from "../src/deck";
import {
  draw,
  FALLBACK_CORE,
  floorDivide,
  pair,
  validAddress,
  validDay,
  weekEnding,
  type ChainSnapshot,
} from "../src/reading";
const snapshot: ChainSnapshot = JSON.parse(
  readFileSync(
    new URL("../public/settled-snapshot.json", import.meta.url),
    "utf8",
  ),
);
const subject = FALLBACK_CORE;
const clone = () => structuredClone(snapshot);

test("complete public snapshot replays exactly to contract cumulativeWork", () => {
  assert.ok(validSnapshot(snapshot));
  assert.equal(
    snapshot.rounds.reduce((sum, r) => sum + BigInt(r.work), 0n),
    BigInt(snapshot.cumulativeWork),
  );
  assert.equal(
    new Set(snapshot.rounds.map((r) => r.roundId)).size,
    snapshot.rounds.length,
  );
});
test("actual 30 Oct Core reading matches the pinned Sepolia regression vector", () => {
  const r = draw(subject, "2026-10-30", snapshot);
  assert.equal(
    r.seed,
    "0x778be7b7003a33f2f14083f28780dfc0cc0da82a563e66c4c870ec2323f16b2c",
  );
  assert.deepEqual(
    [
      r.firstRound,
      r.anchor.roundId,
      r.index,
      r.reversed,
      r.luckyRound,
      r.colourIndex,
      r.energy,
      r.provisional,
    ],
    [494n, "493", 4, false, 530n, 0, 12474n, false],
  );
});
test("manual packed bytes reproduce the seed; address is 20 bytes and date is literal UTF-8", () => {
  const r = draw(subject, "2026-10-30", snapshot);
  const bytes =
    "0x" +
    r.anchor.dataHash.slice(2) +
    subject.slice(2) +
    Buffer.from("2026-10-30", "utf8").toString("hex");
  assert.equal((bytes.length - 2) / 2, 62);
  assert.equal(keccak256(bytes), r.seed);
  assert.notEqual(
    keccak256(toUtf8Bytes(`${r.anchor.dataHash}${subject}${r.day}`)),
    r.seed,
  );
});
test("upright and reversed vectors use the most significant bit", () => {
  const a = draw(subject, "2026-10-27", snapshot),
    b = draw(subject, "2026-10-28", snapshot);
  assert.equal(a.index, 0);
  assert.equal(a.reversed, true);
  assert.equal(a.luckyRound, 134n);
  assert.equal(b.index, 20);
  assert.equal(b.reversed, true);
  assert.equal(b.energy, 7548n);
});
test("anchor excludes firstRound, zero work, and all later rounds even with unsorted input", () => {
  const s = clone();
  const expected = draw(subject, "2026-10-30", s);
  s.rounds.push({ ...s.rounds.at(-1)!, roundId: "494", work: "999999" });
  s.rounds.push({ ...s.rounds.at(-1)!, roundId: "493", work: "0" });
  s.rounds.reverse();
  assert.equal(draw(subject, "2026-10-30", s).seed, expected.seed);
  assert.equal(draw(subject, "2026-10-30", s).energy, expected.energy);
});
test("provisional threshold is strict and energy remains a known subtotal", () => {
  const s = clone();
  s.settledThroughRound = "492";
  assert.equal(draw(subject, "2026-10-30", s).provisional, true);
  s.settledThroughRound = "493";
  assert.equal(draw(subject, "2026-10-30", s).provisional, false);
});
test("energy includes lower endpoint and excludes upper endpoint", () => {
  const s = clone();
  const sample = s.rounds[0];
  s.rounds = [
    { ...sample, roundId: "349", work: "1000" },
    { ...sample, roundId: "350", work: "5" },
    { ...sample, roundId: "493", work: "7" },
    { ...sample, roundId: "494", work: "1000" },
  ];
  assert.equal(draw(subject, "2026-10-30", s).energy, 12n);
});
test("genesis exception borrows round 1 without changing mathematical floor", () => {
  const s = clone();
  s.rounds.unshift({ ...s.rounds[0], roundId: "1", work: "1" });
  const r = draw(subject, "2026-10-26", s);
  assert.equal(r.genesisBorrow, true);
  assert.equal(r.anchor.roundId, "1");
  assert.equal(r.firstRound, -82n);
  assert.equal(r.energy, 0n);
  assert.equal(floorDivide(-1n, 600n), -1n);
  assert.equal(floorDivide(-600n, 600n), -1n);
});
test("missing real round 1 remains unavailable instead of inventing a hash", () => {
  const s = clone();
  s.rounds = s.rounds.filter((r) => r.roundId !== "1");
  assert.throws(() => draw(subject, "2026-10-26", s), /Round 1 has no recorded event/);
});
test("week is seven UTC days, crossing months and leap day", () => {
  assert.deepEqual(weekEnding("2026-10-30"), [
    "2026-10-24",
    "2026-10-25",
    "2026-10-26",
    "2026-10-27",
    "2026-10-28",
    "2026-10-29",
    "2026-10-30",
  ]);
  assert.deepEqual(weekEnding("2028-03-02").slice(-4), [
    "2028-02-28",
    "2028-02-29",
    "2028-03-01",
    "2028-03-02",
  ]);
});
test("address/date validation rejects malformed inputs and incorrect checksums", () => {
  assert.ok(validAddress(subject));
  assert.ok(validAddress("0x52908400098527886E0F7030069857D2E4169EE7"));
  for (const input of [
    "",
    "0x123",
    "vitalik.eth",
    "0x52908400098527886E0F7030069857D2E4169Ee7",
  ])
    assert.equal(validAddress(input), false);
  for (const input of [
    "2026-02-30",
    "2026-2-01",
    "<script>",
    "2026-13-01",
    "2026-10-00",
  ])
    assert.equal(validDay(input), false);
  assert.ok(validDay("2028-02-29"));
  assert.throws(() => draw(subject, "2026-10-25", snapshot), /26 October/);
});
test("pair is symmetric, identical cards score 100, opposite indices score zero or 12", () => {
  const a = draw(subject, "2026-10-30", snapshot);
  const b = draw(
    "0x52908400098527886E0F7030069857D2E4169EE7",
    "2026-10-30",
    snapshot,
  );
  assert.deepEqual(pair(a, b), pair(b, a));
  assert.equal(pair(a, a).score, 100);
  assert.equal(
    pair(a, { ...b, index: (a.index + 11) % 22, reversed: !a.reversed }).score,
    0,
  );
  assert.equal(
    pair(a, { ...b, index: (a.index + 11) % 22, reversed: a.reversed }).score,
    12,
  );
  assert.equal(pair({ ...a, index: 21 }, { ...b, index: 0 }).distance, 1);
});
test("shared round uses low-to-high 32-byte seeds, then the documented 144-round window", () => {
  const a = draw(subject, "2026-10-30", snapshot),
    b = draw(
      "0x52908400098527886E0F7030069857D2E4169EE7",
      "2026-10-30",
      snapshot,
    );
  const p = pair(a, b);
  assert.ok(BigInt(p.seeds[0]) <= BigInt(p.seeds[1]));
  assert.equal(p.hash, keccak256(p.seeds[0] + p.seeds[1].slice(2)));
  assert.ok(
    p.sharedRound >= a.firstRound && p.sharedRound < a.firstRound + 144n,
  );
});
test("draw bounds hold across 500 addresses and independent day inputs", () => {
  for (let i = 1; i <= 500; i++) {
    const address = "0x" + i.toString(16).padStart(40, "0"),
      day = ["2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"][i % 4];
    const r = draw(address, day, snapshot);
    assert.ok(r.index >= 0 && r.index < 22);
    assert.ok(r.colourIndex >= 0 && r.colourIndex < 12);
    assert.ok(
      r.luckyRound >= r.firstRound && r.luckyRound < r.firstRound + 144n,
    );
    const p = pair(r, draw(subject, day, snapshot));
    assert.ok(p.score >= 0 && p.score <= 100);
  }
});
test("stored snapshots reject incomplete histories and invalid values", () => {
  const incomplete = clone();
  incomplete.rounds.pop();
  assert.equal(validSnapshot(incomplete), false);
  const duplicate = clone();
  duplicate.rounds.push(duplicate.rounds[0]);
  assert.equal(validSnapshot(duplicate), false);
  for (const bad of [
    null,
    {},
    { ...snapshot, roundDuration: "0" },
    { ...snapshot, core: "0xBAD" },
    { ...snapshot, rounds: undefined },
  ])
    assert.equal(validSnapshot(bad), false);
});
test("deck order and colour count are fixed", () => {
  assert.equal(DECK.length, 22);
  assert.equal(COLOURS.length, 12);
  assert.equal(DECK[0].name, "The Hamster");
  assert.equal(DECK[21].name, "The Hoard");
  assert.ok(DECK.every((c) => c.upright && c.reversed && c.omen));
  assert.equal(new Set(DECK.map((c) => c.name)).size, 22);
});
