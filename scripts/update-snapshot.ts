/** Captures public Sepolia data only; never used at build or test time. */
import { writeFile } from "node:fs/promises";
import { loadChain } from "../src/chain";
const snapshot = await loadChain(undefined, (message) => console.log(message));
await writeFile("public/settled-snapshot.json", JSON.stringify(snapshot));
console.log(
  JSON.stringify({
    block: snapshot.blockNumber,
    rounds: snapshot.rounds.length,
    settledThrough: snapshot.settledThroughRound,
    fetchedAt: snapshot.fetchedAt,
  }),
);
