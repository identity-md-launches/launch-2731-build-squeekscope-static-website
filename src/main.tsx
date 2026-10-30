import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { createRoot } from "react-dom/client";
import {
  API,
  CACHE_KEY,
  cachedSnapshot,
  fetchJson,
  loadChain,
  RPC,
} from "./chain";
import { cardImage, COLOURS, DECK, roman } from "./deck";
import {
  draw,
  FIRST_DAY,
  pair,
  readingUrl,
  utcToday,
  validAddress,
  validDay,
  weekEnding,
  type ChainSnapshot,
  type Reading,
} from "./reading";
import { saveReadingImage } from "./save-image";
import "./style.css";

function Icon({
  name,
  size = 20,
}: {
  name:
    | "arrow"
    | "download"
    | "link"
    | "sun"
    | "moon"
    | "close"
    | "wallet"
    | "external";
  size?: number;
}) {
  const paths = {
    arrow: (
      <>
        <path d="M4 12h16m-6-6 6 6-6 6" />
      </>
    ),
    download: (
      <>
        <path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5" />
      </>
    ),
    link: (
      <>
        <path d="m9 15 6-6m-8 4-2 2a4 4 0 0 0 6 6l3-3m-3-12 2-2a4 4 0 0 1 6 6l-3 3" />
      </>
    ),
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 1v3m0 16v3M1 12h3m16 0h3M4 4l2 2m12 12 2 2M4 20l2-2M18 6l2-2" />
      </>
    ),
    moon: <path d="M20 15A9 9 0 0 1 9 4a9 9 0 1 0 11 11Z" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    wallet: (
      <>
        <path d="M4 6h15v14H3V5l13-2v3m3 5h-6v5h6" />
        <path d="M16 13.5h.01" />
      </>
    ),
    external: (
      <>
        <path d="M14 3h7v7m0-7L10 14M10 4H4v16h16v-6" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}
function WheelMark() {
  return (
    <svg
      viewBox="0 0 44 48"
      width="35"
      height="39"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      aria-hidden="true"
    >
      <circle cx="22" cy="21" r="18" />
      <circle cx="22" cy="21" r="14" strokeWidth=".8" />
      <path d="M22 39v6m-12 0h24M14 24q-3-13 2-10l6 3 6-3q5-3 2 10-1 8-8 8t-8-8Z" />
      <circle cx="19" cy="22" r="1" fill="currentColor" />
      <circle cx="25" cy="22" r="1" fill="currentColor" />
    </svg>
  );
}
const displayDate = (day: string, long = false) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: long ? "long" : "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${day}T00:00:00Z`));
const formatInt = (n: bigint | string) => BigInt(n).toLocaleString("en-GB");
function useLocation() {
  const [query, setQuery] = useState(() => location.search);
  useEffect(() => {
    const handler = () => setQuery(location.search);
    addEventListener("popstate", handler);
    return () => removeEventListener("popstate", handler);
  }, []);
  const navigate = useCallback((url: string) => {
    history.pushState(null, "", url);
    setQuery(location.search);
  }, []);
  return { params: new URLSearchParams(query), navigate };
}
function useChain() {
  const [snapshot, setSnapshot] = useState<ChainSnapshot>();
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("Reading the wheel…");
  const ref = useRef<ChainSnapshot>(undefined);
  const mounted = useRef(true),
    busy = useRef(false);
  const refresh = useCallback(async () => {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError("");
    try {
      const next = await loadChain(ref.current, (message) => {
        if (mounted.current) setProgress(message);
      });
      if (!mounted.current) return;
      ref.current = next;
      setSnapshot(next);
      setLive(true);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(next));
      } catch {
        /* Reading works without storage. */
      }
    } catch (e) {
      if (mounted.current) {
        setLive(false);
        setError(
          e instanceof Error
            ? e.message
            : "Unable to reach Sepolia. Check your connection and refresh.",
        );
      }
    } finally {
      busy.current = false;
      if (mounted.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    mounted.current = true;
    void (async () => {
      const cached = await cachedSnapshot();
      if (!mounted.current) return;
      if (cached) {
        ref.current = cached;
        setSnapshot(cached);
      }
      void refresh();
    })();
    const timer = window.setInterval(() => {
      void refresh();
    }, 90000);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, [refresh]);
  return { snapshot, live, loading, error, progress, refresh };
}
interface MoodData {
  measurement?: {
    freshness?: string;
    observedAt?: string;
    staleAfterSeconds?: number;
    coreStatus?: string;
    rpmMilli?: number;
    distanceMm?: number;
  };
}
function Mood() {
  const [data, setData] = useState<MoodData>();
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let active = true;
    const update = async () => {
      try {
        const value = (await fetchJson(
          `${API}/v1/status`,
          undefined,
          10000,
        )) as MoodData;
        if (active) {
          setData(value);
          setFailed(false);
        }
      } catch {
        if (active) setFailed(true);
      }
    };
    void update();
    const timer = window.setInterval(() => {
      void update();
    }, 15000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  const m = data?.measurement;
  const fresh =
    !failed &&
    m?.freshness === "online" &&
    m.observedAt &&
    Date.now() - Date.parse(m.observedAt) <=
      (m.staleAfterSeconds ?? 120) * 1000;
  const known =
    fresh && (m?.coreStatus === "ACTIVE" || m?.coreStatus === "IDLE");
  const awake = m?.coreStatus === "ACTIVE";
  return (
    <aside className="mood" aria-label="Live hamster mood">
      <span className="mood-symbol">
        <Icon name={awake && known ? "sun" : "moon"} size={24} />
      </span>
      <div>
        <div className="mood-title">
          {known
            ? `Squeektoshi: ${awake ? "awake" : "asleep"}`
            : failed || data
              ? "Wheel mood unavailable"
              : "Checking on Squeektoshi…"}
        </div>
        <div className="mood-values">
          {known &&
          typeof m.rpmMilli === "number" &&
          typeof m.distanceMm === "number" ? (
            <>
              <span>{(m.rpmMilli / 1000).toFixed(1)} rpm</span>
              <span>{(m.distanceMm / 1000000).toFixed(2)} km today</span>
            </>
          ) : (
            <span>Live mood only; cards use settled work.</span>
          )}
        </div>
      </div>
      <span
        className="live-dot"
        data-online={!!known}
        title={
          m?.observedAt
            ? `Observed ${m.observedAt}`
            : "Updates every 15 seconds"
        }
      />
    </aside>
  );
}
interface Provider {
  request(args: { method: "eth_requestAccounts" }): Promise<unknown>;
}
interface WalletDetail {
  info: { uuid: string; name: string };
  provider: Provider;
}
declare global {
  interface Window {
    ethereum?: Provider;
  }
}
function DrawForm({
  day,
  subject,
  landing,
  onDraw,
}: {
  day: string;
  subject: string;
  landing: boolean;
  onDraw: (a: string, d: string) => void;
}) {
  const [address, setAddress] = useState(landing ? "" : subject);
  const [date, setDate] = useState(day);
  const [error, setError] = useState("");
  const [dateError, setDateError] = useState("");
  const [walletMessage, setWalletMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [wallets, setWallets] = useState<WalletDetail[]>([]);
  const dialog = useRef<HTMLDialogElement>(null);
  const addressInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setDate(day);
    setAddress(landing ? "" : subject);
    setError("");
    setDateError("");
    setWalletMessage("");
  }, [day, subject, landing]);
  useEffect(() => {
    const announce = (event: Event) => {
      const detail = (event as CustomEvent<WalletDetail>).detail;
      if (
        detail?.provider &&
        detail.info?.uuid &&
        typeof detail.info.name === "string"
      )
        setWallets((existing) =>
          existing.some((w) => w.info.uuid === detail.info.uuid)
            ? existing
            : [...existing, detail],
        );
    };
    addEventListener("eip6963:announceProvider", announce);
    dispatchEvent(new Event("eip6963:requestProvider"));
    return () => removeEventListener("eip6963:announceProvider", announce);
  }, []);
  async function requestAddress(provider?: Provider) {
    dialog.current?.close();
    if (!provider) {
      setWalletMessage(
        "Paste an address, or open this page in a browser with a wallet installed.",
      );
      return;
    }
    setPending(true);
    setWalletMessage("");
    try {
      const result = await provider.request({ method: "eth_requestAccounts" });
      if (!Array.isArray(result) || !validAddress(String(result[0])))
        throw new Error(
          "No address was returned. Paste an Ethereum address instead.",
        );
      setAddress(String(result[0]));
      setError("");
      setWalletMessage(
        "Address filled. Select Draw my card when you’re ready.",
      );
      addressInput.current?.focus();
    } catch (e) {
      setWalletMessage(
        (e as { code?: number }).code === 4001
          ? "Request cancelled. You can paste an address instead."
          : "Unable to read a wallet address. You can paste an address instead.",
      );
    } finally {
      setPending(false);
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setDateError("");
    if (!validAddress(address.trim())) {
      setError(
        "Enter all 42 characters of an Ethereum address. Use lowercase or a valid checksum.",
      );
      addressInput.current?.focus();
      return;
    }
    if (!validDay(date) || date < FIRST_DAY) {
      setDateError("Choose a UTC date on or after 26 October 2026.");
      document.getElementById("draw-date")?.focus();
      return;
    }
    onDraw(address.trim().toLowerCase(), date);
  }
  return (
    <section
      className="draw-section"
      id="draw-yours"
      aria-labelledby="draw-title"
    >
      <div className="form-heading">
        <h2 id="draw-title">{landing ? "Draw yours" : "Draw another"}</h2>
        <button
          type="button"
          className="text-button wallet-button"
          onClick={() =>
            wallets.length > 1
              ? dialog.current?.showModal()
              : void requestAddress(wallets[0]?.provider ?? window.ethereum)
          }
          disabled={pending}
        >
          <Icon name="wallet" size={17} />
          {pending ? "Opening wallet…" : "Use wallet"}
        </button>
      </div>
      <form onSubmit={submit} noValidate>
        <label htmlFor="draw-address">Ethereum address</label>
        <input
          id="draw-address"
          ref={addressInput}
          name="address"
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          placeholder="0x…"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          aria-invalid={!!error}
          aria-describedby={error ? "address-error" : "address-hint"}
        />
        {error && (
          <p className="field-error" id="address-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-bottom">
          <div className="date-field">
            <label htmlFor="draw-date">
              Date <span className="muted">(UTC)</span>
            </label>
            <input
              id="draw-date"
              type="date"
              name="day"
              min={FIRST_DAY}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              aria-invalid={!!dateError}
              aria-describedby={dateError ? "date-error" : undefined}
            />
          </div>
          <button type="submit" className="button primary">
            Draw my card <Icon name="arrow" size={18} />
          </button>
        </div>
        {dateError && (
          <p className="field-error" id="date-error" role="alert">
            {dateError}
          </p>
        )}
        <p className="form-hint" id="address-hint">
          Any address. No signatures. Just a little fate.
        </p>
        <p className="wallet-message" role="status">
          {walletMessage}
        </p>
      </form>
      <dialog
        ref={dialog}
        className="wallet-dialog"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current.close();
        }}
      >
        <div className="dialog-title">
          <h2>Fill from a wallet</h2>
          <button
            className="icon-button"
            aria-label="Close wallet list"
            onClick={() => dialog.current?.close()}
          >
            <Icon name="close" />
          </button>
        </div>
        <p>Only your address is requested.</p>
        {wallets.map((w) => (
          <button
            className="button wallet-row"
            key={w.info.uuid}
            onClick={() => void requestAddress(w.provider)}
          >
            {w.info.name}
          </button>
        ))}
      </dialog>
    </section>
  );
}
function CardArt({
  reading,
  className = "",
}: {
  reading: Reading;
  className?: string;
}) {
  return (
    <img
      className={`card-art ${reading.reversed ? "reversed" : ""} ${className}`}
      src={cardImage(reading.index)}
      width="360"
      height="500"
      alt={`${DECK[reading.index].name}, ${reading.reversed ? "reversed" : "upright"}: original engraved hamster tarot illustration`}
    />
  );
}
function ReadingContent({
  reading,
  landing,
}: {
  reading: Reading;
  landing: boolean;
}) {
  const card = DECK[reading.index];
  return (
    <section className="reading-section" aria-labelledby="card-name">
      <div className="reading-dateline">
        <span>{landing ? "Squeektoshi’s own card" : "Your daily card"}</span>
        <span>{displayDate(reading.day)} · UTC</span>
      </div>
      <div className="reading-spread">
        <div className="art-stage">
          <CardArt reading={reading} />
          <span className="art-caption">
            {roman(reading.index)} · {card.theme}
          </span>
        </div>
        <div className="reading-copy">
          <div className="orientation">
            <span>{reading.reversed ? "↓ Reversed" : "↑ Upright"}</span>
            <span
              className="settlement-badge"
              data-provisional={reading.provisional}
            >
              {reading.provisional ? "Provisional" : "Settled"}
            </span>
          </div>
          <h2 id="card-name">{card.name}</h2>
          <p className="card-reading">
            {reading.reversed ? card.reversed : card.upright}
          </p>
          <div className="omen">
            <span className="omen-mark" aria-hidden="true">
              ✧
            </span>
            <p>
              <span className="omen-label">The omen</span>
              {card.omen}
            </p>
          </div>
          <div className="reading-subject">
            <span>Drawn for {landing ? "SqueekCore" : "this address"}</span>
            <code>{reading.subject}</code>
          </div>
        </div>
      </div>
      <dl className="reading-facts">
        <div>
          <dt>Lucky round</dt>
          <dd>#{formatInt(reading.luckyRound)}</dd>
        </div>
        <div>
          <dt>Lucky colour</dt>
          <dd className="lucky-colour">
            <span
              className="colour-swatch"
              style={{ backgroundColor: COLOURS[reading.colourIndex].hex }}
              aria-hidden="true"
            />
            {COLOURS[reading.colourIndex].name}
          </dd>
        </div>
        <div>
          <dt>Wheel energy</dt>
          <dd>
            {formatInt(reading.energy)} <span className="unit">work</span>
          </dd>
        </div>
      </dl>
      {reading.provisional && (
        <p className="provisional-note">
          This card is provisional: the rounds before this day have not all
          settled. The card and wheel energy may change.
        </p>
      )}
    </section>
  );
}
function ShareActions({
  reading,
  second,
}: {
  reading: Reading;
  second?: string;
}) {
  const [saving, setSaving] = useState(false),
    [message, setMessage] = useState("");
  const link = readingUrl(reading.subject, reading.day, second);
  useEffect(() => {
    setMessage("");
  }, [reading.seed, second]);
  async function save() {
    setSaving(true);
    setMessage("");
    try {
      await saveReadingImage(reading);
      setMessage("Saved a 1080 × 1350 image to your downloads.");
    } catch {
      setMessage(
        "Unable to save the image. Try again in a browser that supports PNG downloads.",
      );
    } finally {
      setSaving(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setMessage("Reading link copied.");
    } catch {
      setMessage("Copy the reading link from the field below.");
    }
  }
  return (
    <div className="share-section">
      <div className="share-actions">
        <button
          className="button secondary"
          onClick={() => void save()}
          disabled={saving}
        >
          <Icon name="download" />
          {saving ? "Drawing image…" : "Save image"}
        </button>
        <a
          className="button secondary"
          target="_blank"
          rel="noopener noreferrer"
          href={`https://twitter.com/intent/tweet?${new URLSearchParams({ text: `My little wheel of fate: ${DECK[reading.index].name} (${reading.reversed ? "reversed" : "upright"}).`, url: link })}`}
        >
          Post on X <Icon name="external" size={16} />
        </a>
        <button className="text-button" onClick={() => void copy()}>
          <Icon name="link" size={18} />
          Copy link
        </button>
      </div>
      <p role="status" className="share-status">
        {message}
      </p>
      {message.startsWith("Copy the") && (
        <input
          className="copy-fallback"
          aria-label="Reading permalink"
          readOnly
          value={link}
          onFocus={(e) => e.target.select()}
        />
      )}
    </div>
  );
}
function Week({
  reading,
  snapshot,
  second,
  navigate,
}: {
  reading: Reading;
  snapshot: ChainSnapshot;
  second?: string;
  navigate: (url: string) => void;
}) {
  return (
    <section className="week-section" aria-labelledby="week-title">
      <div className="section-heading">
        <h2 id="week-title">Seven little fortunes</h2>
        <span className="muted">
          The week ending {displayDate(reading.day)}
        </span>
      </div>
      <div className="week-strip">
        {weekEnding(reading.day).map((day) => {
          let r: Reading | undefined;
          try {
            if (day >= FIRST_DAY) r = draw(reading.subject, day, snapshot);
          } catch {
            /* No invented card when an anchor is absent. */
          }
          const label = new Intl.DateTimeFormat("en-GB", {
            weekday: "short",
            timeZone: "UTC",
          }).format(new Date(`${day}T00:00:00Z`));
          const content = (
            <>
              <span className="week-day">
                {label} <span>{Number(day.slice(-2))}</span>
              </span>
              <img
                src={r ? cardImage(r.index) : "./cards/back.svg"}
                className={r?.reversed ? "reversed" : ""}
                width="360"
                height="500"
                alt={
                  r
                    ? `${DECK[r.index].name}, ${r.reversed ? "reversed" : "upright"}${r.provisional ? ", provisional" : ""}`
                    : day < FIRST_DAY
                      ? "Face down: before 26 October 2026"
                      : "Face down: awaiting an anchor"
                }
              />
              <span className="week-name">
                {r
                  ? DECK[r.index].name
                  : day < FIRST_DAY
                    ? "Face down"
                    : "No anchor"}
              </span>
            </>
          );
          return r ? (
            <a
              key={day}
              href={readingUrl(reading.subject, day, second)}
              className={`week-card ${day === reading.day ? "selected" : ""}`}
              aria-current={day === reading.day ? "date" : undefined}
              onClick={(e) => {
                if (!e.metaKey && !e.ctrlKey && !e.shiftKey && e.button === 0) {
                  e.preventDefault();
                  navigate(readingUrl(reading.subject, day, second));
                }
              }}
            >
              {content}
            </a>
          ) : (
            <div className="week-card face-down" key={day}>
              {content}
            </div>
          );
        })}
      </div>
      <p className="section-note">
        Select a day to read it. Before 26 October 2026, the cards stay face
        down.
        {weekEnding(reading.day).includes(FIRST_DAY) &&
          !snapshot.rounds.some((r) => r.roundId === "1") &&
          " The genesis day also stays face down: round 1 has no recorded anchor."}
      </p>
    </section>
  );
}
function PairSection({
  reading,
  second,
  snapshot,
  navigate,
}: {
  reading: Reading;
  second?: string;
  snapshot: ChainSnapshot;
  navigate: (url: string) => void;
}) {
  const [input, setInput] = useState(second || ""),
    [error, setError] = useState("");
  useEffect(() => {
    setInput(second || "");
    setError("");
  }, [second]);
  const field = useRef<HTMLInputElement>(null);
  let b: Reading | undefined;
  try {
    if (second) b = draw(second, reading.day, snapshot);
  } catch {
    /* Invalid query is shown next to the field. */
  }
  const p = b ? pair(reading, b) : undefined;
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!validAddress(input.trim())) {
      setError(
        "Enter a complete Ethereum address with a valid checksum, or use lowercase.",
      );
      field.current?.focus();
      return;
    }
    setError("");
    navigate(
      readingUrl(reading.subject, reading.day, input.trim().toLowerCase()),
    );
  }
  return (
    <section className="pair-section" aria-labelledby="pair-title">
      <div className="pair-intro">
        <span className="pair-symbol" aria-hidden="true">
          ✧ ✧
        </span>
        <h2 id="pair-title">Two hamsters, one orbit.</h2>
        <p>See how another address meets your card.</p>
      </div>
      <form onSubmit={submit} noValidate className="pair-form">
        <label htmlFor="pair-address">Second Ethereum address</label>
        <div className="pair-controls">
          <input
            ref={field}
            id="pair-address"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="0x…"
            aria-invalid={!!error || (!!second && !b)}
            aria-describedby={
              error || (second && !b) ? "pair-error" : undefined
            }
          />
          <button className="button secondary" type="submit">
            Read our pair <Icon name="arrow" size={18} />
          </button>
        </div>
        {(error || (second && !b)) && (
          <p className="field-error" id="pair-error" role="alert">
            {error ||
              "The second address in this link is invalid. Enter a complete Ethereum address."}
          </p>
        )}
      </form>
      {b && p && (
        <div className="pair-result">
          <div className="paired-cards">
            <div>
              <CardArt reading={reading} />
              <span>
                {DECK[reading.index].name}
                <small>{reading.reversed ? "Reversed" : "Upright"}</small>
              </span>
            </div>
            <span className="pair-ampersand">&amp;</span>
            <div>
              <CardArt reading={b} />
              <span>
                {DECK[b.index].name}
                <small>{b.reversed ? "Reversed" : "Upright"}</small>
              </span>
            </div>
          </div>
          <div className="pair-score">
            <p className="score-number">
              {p.score}
              <span>/100</span>
            </p>
            <h3>
              {p.distance === 0
                ? "Running in rhythm"
                : p.distance <= 4
                  ? "A familiar orbit"
                  : p.distance <= 8
                    ? "Room to surprise each other"
                    : "Different sides of the wheel"}
            </h3>
            <p>
              Shared lucky round <strong>#{formatInt(p.sharedRound)}</strong>
            </p>
            <p className="muted">
              {b.provisional || reading.provisional
                ? "Provisional pair"
                : "Both cards settled"}{" "}
              · Same UTC day
            </p>
            <code className="paired-address">{b.subject}</code>
          </div>
          <details className="pair-math">
            <summary>How this pair was drawn</summary>
            <dl className="audit-list">
              <div>
                <dt>Card distance</dt>
                <dd>
                  min(|{reading.index} − {b.index}|, 22 − |{reading.index} −{" "}
                  {b.index}|) = {p.distance}
                </dd>
              </div>
              <div>
                <dt>Score</dt>
                <dd>
                  (11 − {p.distance}) × 8 + {p.bonus} = {p.score}. Add 12 only
                  when both cards have the same orientation.
                </dd>
              </div>
              <div>
                <dt>Second seed</dt>
                <dd>
                  <code>{b.seed}</code>
                </dd>
              </div>
              <div>
                <dt>Sorted seeds</dt>
                <dd>
                  <code>{p.seeds[0]}</code>
                  <code>{p.seeds[1]}</code>
                </dd>
              </div>
              <div>
                <dt>Shared hash</dt>
                <dd>
                  <code>{p.hash}</code>keccak256(abi.encodePacked(bytes32
                  lowSeed, bytes32 highSeed))
                </dd>
              </div>
              <div>
                <dt>Shared round</dt>
                <dd>
                  {reading.firstRound.toString()} + (uint256(sharedHash) mod
                  144) = {p.sharedRound.toString()}. The shared-round range is
                  Squeekscope’s convention: the same 144-round window as the
                  individual lucky round.
                </dd>
              </div>
            </dl>
          </details>
          <button
            className="text-button remove-pair"
            onClick={() => navigate(readingUrl(reading.subject, reading.day))}
          >
            Remove pair
          </button>
        </div>
      )}
    </section>
  );
}
function Audit({
  reading: r,
  snapshot: s,
  live,
}: {
  reading: Reading;
  snapshot: ChainSnapshot;
  live: boolean;
}) {
  return (
    <details className="audit-panel" id="draw-proof">
      <summary>
        <span>How this card was drawn</span>
        <span className="disclosure-symbol" aria-hidden="true">
          +
        </span>
      </summary>
      <div className="audit-content">
        <p>
          Same address. Same UTC day. Same settled anchor. Every part of your
          card can be checked below.
        </p>
        <dl className="audit-list">
          <div>
            <dt>Day key</dt>
            <dd>
              <code>{r.day}</code>UTC day start = {r.dayStart.toString()}{" "}
              seconds since Unix epoch.
            </dd>
          </div>
          <div>
            <dt>Round clock</dt>
            <dd>
              genesisTimestamp = {s.genesisTimestamp}; roundDuration ={" "}
              {s.roundDuration} seconds, read from configuration().
            </dd>
          </div>
          <div>
            <dt>First round</dt>
            <dd>
              floor(({r.dayStart.toString()} − {s.genesisTimestamp}) /{" "}
              {s.roundDuration}) + 1 = {r.firstRound.toString()}
              {r.genesisBorrow && (
                <p>
                  The genesis day borrows round 1 as its anchor. Its first round
                  still follows the formula, including negative values before
                  genesis.
                </p>
              )}
            </dd>
          </div>
          <div>
            <dt>Anchor round</dt>
            <dd>
              #{r.anchor.roundId}:{" "}
              {r.genesisBorrow
                ? "the genesis-day exception, round 1"
                : `the last round with work > 0 and roundId < ${r.firstRound}`}
              . Work = {r.anchor.work}.
            </dd>
          </div>
          <div>
            <dt>Anchor dataHash</dt>
            <dd>
              <code>{r.anchor.dataHash}</code>
            </dd>
          </div>
          <div>
            <dt>Settlement transaction</dt>
            <dd>
              <a
                className="hash-link"
                href={`https://sepolia.etherscan.io/tx/${r.anchor.transactionHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {r.anchor.transactionHash}
                <Icon name="external" size={15} />
              </a>
            </dd>
          </div>
          <div>
            <dt>Subject</dt>
            <dd>
              <code>{r.subject}</code>
            </dd>
          </div>
          <div>
            <dt>Seed</dt>
            <dd>
              <code>{r.seed}</code>
              <code>uint256(seed) = {r.value.toString()}</code>
              keccak256(abi.encodePacked(bytes32 anchor.dataHash, address
              subject, string dayKey)). Packed bytes: 32 + 20 + 10 = 62.
            </dd>
          </div>
          <div>
            <dt>Card index</dt>
            <dd>
              uint256(seed) mod 22 = {r.index} (zero based) →{" "}
              {DECK[r.index].name}.
            </dd>
          </div>
          <div>
            <dt>Way up</dt>
            <dd>
              seed &gt;&gt; 255 = {r.reversed ? "1 → Reversed" : "0 → Upright"}.
            </dd>
          </div>
          <div>
            <dt>Lucky round</dt>
            <dd>
              {r.firstRound.toString()} + ((seed &gt;&gt; 64) mod 144) ={" "}
              {r.firstRound.toString()} + {((r.value >> 64n) % 144n).toString()}{" "}
              = {r.luckyRound.toString()}.
            </dd>
          </div>
          <div>
            <dt>Lucky colour</dt>
            <dd>
              (seed &gt;&gt; 128) mod 12 = {r.colourIndex} →{" "}
              {COLOURS[r.colourIndex].name}.
              <ol start={0} className="colour-key">
                {COLOURS.map((c) => (
                  <li key={c.name}>
                    <span
                      className="colour-swatch"
                      style={{ backgroundColor: c.hex }}
                      aria-hidden="true"
                    />
                    {c.name}
                  </li>
                ))}
              </ol>
            </dd>
          </div>
          <div>
            <dt>Wheel energy</dt>
            <dd>
              Σ work for rounds {String(r.firstRound - 144n)} through{" "}
              {String(r.firstRound - 1n)} = {r.energy.toString()} work units.
              Settled gaps are zero; unsettled rounds remain unknown.
              {r.provisional &&
                " This is the known subtotal until settlement finishes."}
            </dd>
          </div>
          <div>
            <dt>Settlement</dt>
            <dd>
              state().settledThroughRound = {s.settledThroughRound}. Provisional
              if {s.settledThroughRound} &lt; {String(r.firstRound - 1n)} →{" "}
              {r.provisional ? "true" : "false"}.
            </dd>
          </div>
          <div>
            <dt>Chain evidence</dt>
            <dd>
              Ethereum Sepolia (11155111), block{" "}
              <a
                href={`https://sepolia.etherscan.io/block/${s.blockNumber}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {s.blockNumber}
              </a>
              , 12 confirmations at capture.<code>{s.blockHash}</code>Core:{" "}
              <a
                href={`https://sepolia.etherscan.io/address/${s.core}`}
                target="_blank"
                rel="noopener noreferrer"
                className="hash-link"
              >
                {s.core}
              </a>
              Deployment block: {s.deploymentBlock}. Logs scanned in chunks of
              at most 45,000 blocks.
            </dd>
          </div>
          <div>
            <dt>Data freshness</dt>
            <dd>
              {live ? "Fresh RPC read" : "Stored chain snapshot"}, captured{" "}
              {s.fetchedAt}. Chain refresh: 90 seconds.{" "}
              <a href={RPC} target="_blank" rel="noopener noreferrer">
                Publicnode Sepolia RPC
              </a>{" "}
              ·{" "}
              <a
                href={`${API}/v1/core`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Core identity API
              </a>
            </dd>
          </div>
        </dl>
        <h3>Draw rules, exactly</h3>
        <pre className="rules-code">{`dayKey = UTC date YYYY-MM-DD\nfirstRound = floor((dayStart - genesisTimestamp) / roundDuration) + 1\nanchor = last round with work > 0 and roundId < firstRound\n  (the genesis day borrows round 1)\nseed = keccak256(abi.encodePacked(bytes32 anchor.dataHash, address subject, string dayKey))\ncard = seed mod 22\nreversed = top bit of seed\nluckyRound = firstRound + ((seed >> 64) mod 144)\ncolour = (seed >> 128) mod 12\nenergy = total work in rounds firstRound-144 to firstRound-1\nprovisional = settledThroughRound < firstRound-1`}</pre>
      </div>
    </details>
  );
}
function Deck() {
  return (
    <>
      <div className="deck-intro">
        <h1>A pocket-sized cosmos.</h1>
        <p>Twenty-two cards. A whole world inside one wheel.</p>
      </div>
      <div className="gallery-controls">
        <span>Explore both sides of every card.</span>
        <a className="text-button" href="./">
          Read today’s card
        </a>
      </div>
      <div className="deck-grid">
        {DECK.map((card, index) => (
          <article className="deck-card" key={card.name} id={`card-${index}`}>
            <div className="deck-art">
              <img
                src={cardImage(index)}
                alt={`${card.name}: original engraved illustration`}
                width="360"
                height="500"
                loading="lazy"
              />
            </div>
            <h2>{card.name}</h2>
            <p>
              <strong>Upright</strong>
              {card.upright}
            </p>
            <p>
              <strong>Reversed</strong>
              {card.reversed}
            </p>
            <p className="gallery-omen">{card.omen}</p>
          </article>
        ))}
      </div>
    </>
  );
}
function App() {
  const { params, navigate } = useLocation();
  const chain = useChain();
  const [today, setToday] = useState(utcToday());
  useEffect(() => {
    const timer = window.setInterval(() => setToday(utcToday()), 15000);
    return () => clearInterval(timer);
  }, []);
  const deckPage = params.has("deck"),
    landing = !params.has("a");
  const requestedDay = params.get("d") || today;
  const subject = landing ? chain.snapshot?.core || "" : params.get("a") || "";
  const second = params.get("b") || undefined;
  let reading: Reading | undefined,
    readingError = "";
  try {
    if (chain.snapshot) reading = draw(subject, requestedDay, chain.snapshot);
  } catch (e) {
    readingError = e instanceof Error ? e.message : "Unable to draw this card.";
  }
  const drawCard = (a: string, d: string) => {
    navigate(readingUrl(a, d));
    document.getElementById("reading-top")?.scrollIntoView({ block: "start" });
    document.getElementById("reading-top")?.focus({ preventScroll: true });
  };
  useEffect(() => {
    document.title = deckPage
      ? "The 22-card deck · Squeekscope"
      : reading
        ? `${DECK[reading.index].name} · ${reading.day} · Squeekscope`
        : "Squeekscope — Daily hamster tarot";
  }, [deckPage, reading?.index, reading?.day]);
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to reading
      </a>
      <div className="site-shell">
        <header className="site-header">
          <a className="wordmark" href="./" aria-label="Squeekscope home">
            <WheelMark />
            <span>Squeekscope</span>
          </a>
          <nav aria-label="Main navigation">
            <a href="./" aria-current={!deckPage ? "page" : undefined}>
              Daily reading
            </a>
            <a href="?deck" aria-current={deckPage ? "page" : undefined}>
              The deck <span aria-hidden="true">↗</span>
            </a>
          </nav>
        </header>
        <main id="main">
          {deckPage ? (
            <Deck />
          ) : (
            <>
              <div className="page-intro" id="reading-top" tabIndex={-1}>
                <div>
                  <h1>A little wheel of fate.</h1>
                  <p>
                    Daily hamster tarot, drawn from Squeektoshi’s settled wheel
                    work.
                  </p>
                </div>
                <Mood />
              </div>
              <div className="main-grid">
                <div className="reading-column">
                  {reading ? (
                    <ReadingContent reading={reading} landing={landing} />
                  ) : (
                    <section className="empty-reading">
                      <img
                        src="./cards/back.svg"
                        width="360"
                        height="500"
                        alt="A face-down Squeekscope card"
                      />
                      <div>
                        <h2>
                          {readingError
                            ? !validAddress(subject)
                              ? "Check the address."
                              : !validDay(requestedDay) ||
                                  requestedDay < FIRST_DAY
                                ? "Choose a reading date."
                                : "No recorded anchor."
                            : "Listening to the wheel."}
                        </h2>
                        <p role="status">
                          {readingError ||
                            (chain.error
                              ? "The public chain data could not be loaded. Check your connection and try again."
                              : chain.progress)}
                        </p>
                        <button
                          className="button secondary"
                          onClick={() => void chain.refresh()}
                          disabled={chain.loading}
                        >
                          {chain.loading
                            ? "Reading chain data…"
                            : "Retry chain read"}
                        </button>
                      </div>
                    </section>
                  )}
                </div>
                <DrawForm
                  day={validDay(requestedDay) ? requestedDay : today}
                  subject={subject}
                  landing={landing}
                  onDraw={drawCard}
                />
              </div>
              {reading && <ShareActions reading={reading} second={second} />}
              <div className="data-status">
                <span>
                  <span className="status-dot" data-live={chain.live} />{" "}
                  {chain.loading
                    ? "Refreshing settled work…"
                    : chain.live
                      ? "Reading from Ethereum Sepolia"
                      : chain.snapshot
                        ? `Snapshot · ${new Date(chain.snapshot.fetchedAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "UTC" })} UTC`
                        : "Waiting for Ethereum Sepolia"}
                  {chain.snapshot && (
                    <span className="settled-through">
                      {" "}
                      · Settled through #
                      {formatInt(chain.snapshot.settledThroughRound)}
                    </span>
                  )}
                </span>
                <button
                  className="text-button"
                  onClick={() => void chain.refresh()}
                  disabled={chain.loading}
                >
                  {chain.loading ? "Refreshing" : "Refresh data"}
                </button>
              </div>
              {chain.error && (
                <p className="data-error" role="status">
                  {chain.snapshot
                    ? "Showing the last complete chain snapshot. "
                    : ""}
                  {chain.error} Use Refresh data to retry.
                </p>
              )}
              {reading && chain.snapshot && (
                <>
                  <Week
                    reading={reading}
                    snapshot={chain.snapshot}
                    second={second}
                    navigate={navigate}
                  />
                  <PairSection
                    reading={reading}
                    second={second}
                    snapshot={chain.snapshot}
                    navigate={navigate}
                  />
                  <Audit
                    reading={reading}
                    snapshot={chain.snapshot}
                    live={chain.live}
                  />
                </>
              )}
              <section className="about-section">
                <WheelMark />
                <div>
                  <h2>A real hamster. A readable fate.</h2>
                  <p>
                    Squeektoshi runs. Squeekchain settles the work on Ethereum
                    Sepolia. Squeekscope turns a settled round, an address and a
                    UTC date into a small daily reading. Live mood is just
                    company; it never picks your card.
                  </p>
                  <a
                    href="https://docs.squeekchain.com/llms-full.txt"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Read the Squeekchain reference{" "}
                    <Icon name="external" size={15} />
                  </a>
                </div>
                <a className="button secondary" href="?deck">
                  Meet all 22 cards <Icon name="arrow" size={18} />
                </a>
              </section>
            </>
          )}
        </main>
        <footer>
          <a className="footer-brand" href="./">
            <WheelMark />
            Squeekscope
          </a>
          <p>
            A fan project. Squeektoshi and Squeekchain belong to{" "}
            <a
              href="https://squeekchain.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              squeekchain.com
            </a>
            .
          </p>
          <span>Made of small revolutions.</span>
        </footer>
      </div>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
