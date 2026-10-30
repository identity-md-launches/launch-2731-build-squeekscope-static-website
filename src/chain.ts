import { Interface } from "ethers";
import {
  DEPLOYMENT_BLOCK,
  FALLBACK_CORE,
  validAddress,
  type ChainSnapshot,
  type Round,
} from "./reading";
export const RPC = "https://ethereum-sepolia-rpc.publicnode.com";
export const API = "https://api.squeekchain.com";
export const ABI = new Interface([
  "event RoundRecorded(uint64 indexed roundId,uint64 work,uint64 cumulativeWork,uint96 cumulativeBlockUnits,uint32 workPerThousandBlocks,bytes32 dataHash)",
  "function configuration() view returns ((bytes32 streamId,uint64 genesisTimestamp,uint64 roundDuration,uint64 maxWorkPerRound,uint16 maxRoundsPerBatch,address guardian,address reporter,uint32 initialWorkPerThousandBlocks,uint64 targetBlocksPerActiveRound,uint64 difficultySmoothingRounds,uint96 blockUnitsPerBlock))",
  "function state() view returns ((uint64 settledThroughRound,uint64 cumulativeWork,uint96 cumulativeBlockUnits,uint64 blockHeight,uint96 blockProgress,uint32 workPerThousandBlocks,uint256 authorizationNonce,bool paused))",
]);
const CHUNK = 45000;
const hex = (n: number) => `0x${n.toString(16)}`;
interface RpcLog {
  topics: string[];
  data: string;
  transactionHash: string;
  blockNumber: string;
  removed?: boolean;
}
export async function fetchJson(
  url: string,
  init?: RequestInit,
  timeout = 18000,
): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(timeout),
  });
  if (!response.ok)
    throw new Error(`Public data returned HTTP ${response.status}.`);
  return response.json();
}
async function rpcOnce<T>(method: string, params: unknown[]): Promise<T> {
  const response = (await fetchJson(RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  })) as { result?: T; error?: { message: string } };
  if (response.error || response.result === undefined)
    throw new Error(
      response.error?.message || "The Sepolia RPC returned no result.",
    );
  return response.result;
}
export async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  let last: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await rpcOnce<T>(method, params);
    } catch (error) {
      last = error;
      if (
        /not Ethereum|execution reverted|invalid argument|invalid params/i.test(
          String(error),
        )
      )
        throw error;
      if (attempt < 2)
        await new Promise((resolve) =>
          setTimeout(resolve, 250 * (attempt + 1)),
        );
    }
  }
  throw last;
}
export function validSnapshot(value: unknown): value is ChainSnapshot {
  try {
    const s = value as ChainSnapshot;
    return (
      s.version === 1 &&
      validAddress(s.core) &&
      Number.isSafeInteger(s.deploymentBlock) &&
      s.deploymentBlock > 0 &&
      Number.isSafeInteger(s.blockNumber) &&
      s.blockNumber >= s.deploymentBlock &&
      /^0x[0-9a-f]{64}$/i.test(s.blockHash) &&
      /^\d+$/.test(s.genesisTimestamp) &&
      BigInt(s.genesisTimestamp) > 0n &&
      /^\d+$/.test(s.roundDuration) &&
      BigInt(s.roundDuration) > 0n &&
      /^\d+$/.test(s.settledThroughRound) &&
      /^\d+$/.test(s.cumulativeWork) &&
      new Set(s.rounds.map((r) => r.roundId)).size === s.rounds.length &&
      s.rounds.reduce((sum, r) => sum + BigInt(r.work), 0n) ===
        BigInt(s.cumulativeWork) &&
      !isNaN(Date.parse(s.fetchedAt)) &&
      Array.isArray(s.rounds) &&
      s.rounds.every(
        (r) =>
          /^\d+$/.test(r.roundId) &&
          BigInt(r.roundId) > 0n &&
          /^\d+$/.test(r.work) &&
          BigInt(r.roundId) <= BigInt(s.settledThroughRound) &&
          /^0x[0-9a-f]{64}$/i.test(r.dataHash) &&
          /^0x[0-9a-f]{64}$/i.test(r.transactionHash) &&
          Number.isSafeInteger(r.blockNumber) &&
          r.blockNumber >= s.deploymentBlock &&
          r.blockNumber <= s.blockNumber,
      )
    );
  } catch {
    return false;
  }
}
async function getLogs(
  core: string,
  from: number,
  to: number,
): Promise<RpcLog[]> {
  try {
    return await rpc<RpcLog[]>("eth_getLogs", [
      {
        address: core,
        fromBlock: hex(from),
        toBlock: hex(to),
        topics: [ABI.getEvent("RoundRecorded")!.topicHash],
      },
    ]);
  } catch (e) {
    if (
      to - from >= 1024 &&
      /range|limit|large|50000|10000|maximum|pruned history/i.test(String(e))
    ) {
      const middle = Math.floor((from + to) / 2);
      return [
        ...(await getLogs(core, from, middle)),
        ...(await getLogs(core, middle + 1, to)),
      ];
    }
    throw e;
  }
}
export async function loadChain(
  previous?: ChainSnapshot,
  progress?: (message: string) => void,
): Promise<ChainSnapshot> {
  let core = FALLBACK_CORE,
    deploymentBlock = DEPLOYMENT_BLOCK;
  try {
    const data = (await fetchJson(`${API}/v1/core`, undefined, 7000)) as {
      identities?: { core?: string };
      chain?: { deploymentBlock?: string; chainId?: string };
    };
    if (
      validAddress(data.identities?.core || "") &&
      data.chain?.chainId === "11155111" &&
      /^\d+$/.test(data.chain.deploymentBlock || "")
    ) {
      core = data.identities!.core!.toLowerCase();
      deploymentBlock = Number(data.chain!.deploymentBlock);
    }
  } catch {
    /* The supplied public deployment is the explicit fallback. */
  }
  if ((await rpc<string>("eth_chainId", [])) !== "0xaa36a7")
    throw new Error("The public RPC is not Ethereum Sepolia.");
  const tip = Number(BigInt(await rpc<string>("eth_blockNumber", [])));
  const blockNumber = tip - 12;
  const blockTag = hex(blockNumber);
  progress?.("Reading settled wheel work…");
  const [configData, stateData, block] = await Promise.all([
    rpc<string>("eth_call", [
      { to: core, data: ABI.encodeFunctionData("configuration") },
      blockTag,
    ]),
    rpc<string>("eth_call", [
      { to: core, data: ABI.encodeFunctionData("state") },
      blockTag,
    ]),
    rpc<{ hash: string }>("eth_getBlockByNumber", [blockTag, false]),
  ]);
  const config = ABI.decodeFunctionResult("configuration", configData)[0];
  const state = ABI.decodeFunctionResult("state", stateData)[0];
  // Retain a prefix only when its canonical block hash still agrees with the node.
  let prefix: Round[] = [];
  let scanFrom = deploymentBlock;
  if (
    previous &&
    previous.core.toLowerCase() === core &&
    previous.deploymentBlock === deploymentBlock &&
    previous.blockNumber <= blockNumber
  ) {
    const oldBlock = await rpc<{ hash: string } | null>(
      "eth_getBlockByNumber",
      [hex(previous.blockNumber), false],
    );
    if (oldBlock?.hash === previous.blockHash) {
      scanFrom = Math.max(deploymentBlock, previous.blockNumber - 64);
      prefix = previous.rounds.filter((r) => r.blockNumber < scanFrom);
    }
  }
  const rounds = [...prefix];
  for (let from = scanFrom; from <= blockNumber; from += CHUNK) {
    const to = Math.min(from + CHUNK - 1, blockNumber);
    progress?.(
      `Reading blocks ${from.toLocaleString()}–${to.toLocaleString()}…`,
    );
    const logs = await getLogs(core, from, to);
    for (const log of logs) {
      if (log.removed) continue;
      const args = ABI.decodeEventLog("RoundRecorded", log.data, log.topics);
      rounds.push({
        roundId: args.roundId.toString(),
        work: args.work.toString(),
        dataHash: args.dataHash.toLowerCase(),
        transactionHash: log.transactionHash.toLowerCase(),
        blockNumber: Number(BigInt(log.blockNumber)),
      });
    }
  }
  const replayedWork = rounds.reduce(
    (sum, round) => sum + BigInt(round.work),
    0n,
  );
  if (replayedWork !== state.cumulativeWork)
    throw new Error(
      "The log history does not match the settled work total. Refresh to try again.",
    );
  if (new Set(rounds.map((round) => round.roundId)).size !== rounds.length)
    throw new Error(
      "The public RPC returned duplicate rounds. Refresh to try again.",
    );
  const after = await rpc<{ hash: string }>("eth_getBlockByNumber", [
    blockTag,
    false,
  ]);
  if (after.hash !== block.hash)
    throw new Error(
      "The chain reorganized during the read. Refresh to try again.",
    );
  rounds.sort((a, b) => (BigInt(a.roundId) < BigInt(b.roundId) ? -1 : 1));
  const snapshot: ChainSnapshot = {
    version: 1,
    core,
    deploymentBlock,
    genesisTimestamp: config.genesisTimestamp.toString(),
    roundDuration: config.roundDuration.toString(),
    settledThroughRound: state.settledThroughRound.toString(),
    cumulativeWork: state.cumulativeWork.toString(),
    blockNumber,
    blockHash: block.hash,
    fetchedAt: new Date().toISOString(),
    rounds,
  };
  if (!validSnapshot(snapshot))
    throw new Error("The chain response was incomplete. Refresh to try again.");
  return snapshot;
}
export const CACHE_KEY = "squeekscope:settled:v1";
export async function cachedSnapshot(): Promise<ChainSnapshot | undefined> {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(CACHE_KEY) || "null",
    );
    if (validSnapshot(value)) return value;
  } catch {
    /* Storage is optional. */
  }
  try {
    const value = await fetchJson("./settled-snapshot.json", undefined, 6000);
    if (validSnapshot(value)) return value;
  } catch {
    /* Live RPC is still available. */
  }
}
