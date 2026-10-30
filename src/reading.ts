import { getAddress, keccak256, solidityPacked } from "ethers";
import { COLOURS, DECK } from "./deck";
export const FIRST_DAY = "2026-10-26";
export const FALLBACK_CORE = "0x980b4424c007caf7a1f3670b48c8eaef7ebc3d44";
export const DEPLOYMENT_BLOCK = 11998937;
export interface Round {
  roundId: string;
  work: string;
  dataHash: string;
  transactionHash: string;
  blockNumber: number;
}
export interface ChainSnapshot {
  version: 1;
  core: string;
  deploymentBlock: number;
  genesisTimestamp: string;
  roundDuration: string;
  settledThroughRound: string;
  cumulativeWork: string;
  blockNumber: number;
  blockHash: string;
  fetchedAt: string;
  rounds: Round[];
}
export interface Reading {
  day: string;
  subject: string;
  dayStart: bigint;
  firstRound: bigint;
  anchor: Round;
  seed: string;
  value: bigint;
  index: number;
  reversed: boolean;
  luckyRound: bigint;
  colourIndex: number;
  energy: bigint;
  provisional: boolean;
  genesisBorrow: boolean;
}
export const utcToday = () => new Date().toISOString().slice(0, 10);
export function validDay(day: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(day) &&
    Number.isFinite(Date.parse(`${day}T00:00:00Z`)) &&
    new Date(`${day}T00:00:00Z`).toISOString().slice(0, 10) === day
  );
}
export function validAddress(address: string): boolean {
  if (!/^0x[0-9a-fA-F]{40}$/.test(address)) return false;
  try {
    getAddress(address);
    return true;
  } catch {
    return false;
  }
}
export const normalizeAddress = (address: string) =>
  getAddress(address).toLowerCase();
export const shortAddress = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;
export const floorDivide = (a: bigint, b: bigint) =>
  a >= 0n ? a / b : (a - b + 1n) / b;
export function draw(
  subject: string,
  day: string,
  snapshot: ChainSnapshot,
): Reading {
  if (!validDay(day) || day < FIRST_DAY)
    throw new Error("Readings begin on 26 October 2026.");
  if (!validAddress(subject))
    throw new Error(
      "Enter a complete Ethereum address with a valid checksum, or use lowercase.",
    );
  const dayStart = BigInt(Date.parse(`${day}T00:00:00Z`) / 1000);
  const genesis = BigInt(snapshot.genesisTimestamp);
  const duration = BigInt(snapshot.roundDuration);
  if (duration <= 0n)
    throw new Error("The round duration is unavailable. Retry the chain read.");
  const firstRound = floorDivide(dayStart - genesis, duration) + 1n;
  const genesisBorrow =
    new Date(Number(genesis) * 1000).toISOString().slice(0, 10) === day;
  const candidates = snapshot.rounds.filter(
    (r) => BigInt(r.work) > 0n && BigInt(r.roundId) < firstRound,
  );
  const anchor = genesisBorrow
    ? snapshot.rounds.find((r) => r.roundId === "1")
    : candidates.reduce<Round | undefined>(
        (last, r) =>
          !last || BigInt(r.roundId) > BigInt(last.roundId) ? r : last,
        undefined,
      );
  if (!anchor) {
    if (genesisBorrow && BigInt(snapshot.settledThroughRound) >= 1n)
      throw new Error(
        "Round 1 has no recorded event in this settled history. The genesis-day card needs its real dataHash and settlement transaction. Choose a later day.",
      );
    throw new Error(
      "An eligible settled anchor has not arrived. Try refreshing the chain data.",
    );
  }
  const normalized = normalizeAddress(subject);
  const seed = keccak256(
    solidityPacked(
      ["bytes32", "address", "string"],
      [anchor.dataHash, normalized, day],
    ),
  );
  const value = BigInt(seed);
  return {
    day,
    subject: normalized,
    dayStart,
    firstRound,
    anchor,
    seed,
    value,
    genesisBorrow,
    index: Number(value % 22n),
    reversed: value >> 255n === 1n,
    luckyRound: firstRound + ((value >> 64n) % 144n),
    colourIndex: Number((value >> 128n) % 12n),
    energy: snapshot.rounds
      .filter(
        (r) =>
          BigInt(r.roundId) >= firstRound - 144n &&
          BigInt(r.roundId) < firstRound,
      )
      .reduce((total, r) => total + BigInt(r.work), 0n),
    provisional: BigInt(snapshot.settledThroughRound) < firstRound - 1n,
  };
}
export function pair(a: Reading, b: Reading) {
  const rawDistance = Math.abs(a.index - b.index);
  const distance = Math.min(rawDistance, 22 - rawDistance);
  const bonus = a.reversed === b.reversed ? 12 : 0;
  const seeds = [a.seed, b.seed].sort((x, y) =>
    BigInt(x) < BigInt(y) ? -1 : BigInt(x) > BigInt(y) ? 1 : 0,
  );
  const hash = keccak256(solidityPacked(["bytes32", "bytes32"], seeds));
  return {
    distance,
    bonus,
    score: (11 - distance) * 8 + bonus,
    seeds,
    hash,
    sharedRound: a.firstRound + (BigInt(hash) % 144n),
  };
}
export function weekEnding(day: string): string[] {
  return Array.from({ length: 7 }, (_, i) =>
    new Date(Date.parse(`${day}T00:00:00Z`) - (6 - i) * 86400000)
      .toISOString()
      .slice(0, 10),
  );
}
export function readingUrl(a: string, d: string, b?: string): string {
  const url = new URL(location.href);
  url.search = new URLSearchParams({ a, d, ...(b ? { b } : {}) }).toString();
  url.hash = "";
  return url.toString();
}
export function readingText(r: Reading): string {
  return `${DECK[r.index].name} · ${r.reversed ? "Reversed" : "Upright"}\n${r.reversed ? DECK[r.index].reversed : DECK[r.index].upright}\nLucky round ${r.luckyRound} · ${COLOURS[r.colourIndex].name}`;
}
