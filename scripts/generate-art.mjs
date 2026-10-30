import { mkdir, writeFile } from "node:fs/promises";
const ink = "#25241f",
  paper = "#f5efdf",
  blood = "#742f36",
  gold = "#bd8b2d";
const star = (x, y, r = 7) =>
  `<path d="M${x} ${y - r}l${r * 0.3} ${r * 0.7} ${r * 0.7} ${r * 0.3}-${r * 0.7} ${r * 0.3}-${r * 0.3} ${r * 0.7}-${r * 0.3}-${r * 0.7}-${r * 0.7}-${r * 0.3} ${r * 0.7}-${r * 0.3}Z" fill="${gold}" stroke="none"/>`;
const seed = (x, y, s = 1, rot = 0) =>
  `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})"><path d="M0-18C21 1 15 19 0 22C-15 19-21 1 0-18Z" fill="${paper}"/><path d="M0-13V16M-5-5l-2 15M5-5l2 15" stroke-width="1.4"/></g>`;
const hamster = (
  x = 180,
  y = 267,
  s = 1,
  pose = "stand",
) => `<g transform="translate(${x} ${y}) scale(${s})">
  <path d="M-53 43Q-75 53-68 64Q-54 72-45 62M47 44Q72 50 67 62Q56 69 44 61" fill="${paper}"/>
  <path d="M-54-20Q-65 24-42 51Q-4 79 39 53Q71 24 54-18" fill="url(#hatch)"/>
  <ellipse cx="0" cy="21" rx="34" ry="38" fill="${paper}" stroke-width="1.5"/>
  <circle cx="-41" cy="-62" r="22" fill="${paper}"/><circle cx="40" cy="-62" r="22" fill="${paper}"/>
  <path d="M-52-59q9-19 22-1M30-59q12-18 22 0" stroke="${blood}" stroke-width="5"/>
  <path d="M-50-63Q-24-86 2-78Q40-81 54-51Q78-11 45 8Q3 32-43 11Q-78-8-50-63Z" fill="${paper}"/>
  <path d="M-47-59Q-29-78-13-73M12-74q21-4 33 15M-53-49l-8 8M-57-32l-8 4M56-48l8 9M58-30l8 4" stroke-width="1.5"/>
  <ellipse cx="-24" cy="-35" rx="4.5" ry="6" fill="${ink}"/><ellipse cx="25" cy="-35" rx="4.5" ry="6" fill="${ink}"/>
  <path d="M-7-21Q0-27 7-21L0-14Z" fill="${blood}" stroke="${blood}"/>
  <path d="M0-13v7m0 0q-9 9-15 0m15 0q9 9 15 0M-30-15l-28-7m29 15-29 2m87-17 29-7m-28 15 29 2" stroke-width="1.6"/>
  <path d="M-28 18q-12 8-11 22m67-22q12 8 11 22"/>
  ${pose === "seed" ? seed(0, 34, 0.65) : '<path d="M-37 43l11 1m0 0 6-3m55 2-11 1m0 0-6-3"/>'}
  </g>`;
const wheel = (x = 180, y = 240, r = 123) =>
  `<g><circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke-width="4"/><circle cx="${x}" cy="${y}" r="${r - 10}" fill="none" stroke-width="1.5"/>${Array.from(
    { length: 24 },
    (_, i) => {
      let a = (i * Math.PI) / 12;
      return `<path d="M${x + Math.cos(a) * (r - 8)} ${y + Math.sin(a) * (r - 8)}L${x + Math.cos(a) * r} ${y + Math.sin(a) * r}" stroke-width="1.5"/>`;
    },
  ).join(
    "",
  )}<path d="M${x} ${y + r}v36m-55 0h110"/><circle cx="${x}" cy="${y}" r="8" fill="${gold}"/></g>`;
const ground = `<path d="M59 395Q106 389 144 395T229 396T301 395M78 404l18-2m12 1 29 2m76-2 20-1m14 1 31 2" stroke-width="1.4"/>`;
const moon = (x, y, r = 31) =>
  `<path d="M${x + 8} ${y - r}a${r} ${r} 0 1 0 20 ${r + 37}a${r - 3} ${r - 3} 0 0 1-20-${r + 37}Z" fill="${gold}" stroke-width="1.7"/>`;
const flower = (x, y, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})">${Array.from({ length: 12 }, (_, i) => `<ellipse cx="0" cy="-40" rx="10" ry="24" transform="rotate(${i * 30})" fill="${gold}" stroke-width="1.4"/>`).join("")}<circle r="28" fill="url(#hatch)"/><circle r="18" fill="${blood}"/>${Array.from({ length: 9 }, (_, i) => `<circle cx="${((i % 3) - 1) * 9}" cy="${(Math.floor(i / 3) - 1) * 9}" r="1.5" fill="${gold}" stroke="none"/>`).join("")}</g>`;
const envelope = (x, y, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${s})"><rect x="-47" y="-30" width="94" height="60" rx="2" fill="${paper}"/><path d="m-46-29 46 34 46-34m-92 59 32-28m60 28-32-28"/><circle r="8" fill="${blood}" stroke="none"/></g>`;
const arch = `<path d="M85 389V201a95 95 0 0 1 190 0v188M73 389V201a107 107 0 0 1 214 0v188" fill="none"/>`;
const scenes = [
  `${moon(268, 138, 23)}${star(101, 153)}${star(255, 208)}<path d="M120 374q18-22 35-3m50 2q17-24 38-2"/>${hamster(180, 287, 1.2, "seed")}${ground}`,
  `${wheel(180, 232, 123)}${hamster(180, 284, 0.91)}<path d="M100 101q82-41 150 12m0 0-6-20m6 20-21 2" stroke="${blood}"/>${star(82, 337)}${star(283, 340)}`,
  `<circle cx="180" cy="222" r="99" stroke="${gold}"/>${seed(180, 239, 3.1)}<path d="M180 181v-48q-34 2-38-25 39-4 38 25q36-5 40-30-37-5-40 30M130 362q50-38 100 0m-123 14q75-40 146 0"/>${star(86, 145)}${star(279, 329)}`,
  `${moon(262, 139, 22)}<path d="M53 391Q62 202 180 195Q303 200 307 391Z" fill="url(#hatch)"/><path d="M113 389V312a67 67 0 0 1 134 0v77Z" fill="${ink}"/>${hamster(181, 341, 0.55, "seed")}<path d="M63 259q15 0 24 10m-5-44 19 10m166 6 20-9m-9 39 19-8"/>${ground}`,
  `${moon(250, 147, 35)}${star(96, 147)}${star(137, 113)}${star(273, 237)}${wheel(171, 285, 100)}${hamster(171, 324, 0.65)}<path d="M70 405h214"/>`,
  `${hamster(179, 297, 1.06)}<path d="m130 274 85-9 14 98-85 9Z" fill="${paper}"/><path d="m153 292 43-5m-41 15 43-5m-41 15 43-5m-41 15 29-4" stroke-width="1.5"/>${envelope(185, 140, 0.7)}${star(93, 184)}${star(274, 196)}${ground}`,
  `<path d="M118 168v98a62 62 0 0 0 124 0v-98h-42v100a20 20 0 0 1-40 0V168Z" fill="${blood}"/><path d="M118 168h42v42h-42m82-42h42v42h-42" fill="${paper}"/><path d="m89 201-22-13m19 31-27-3m211-19 23-13m-23 33 28-4"/>${seed(155, 125, 0.65, -30)}${seed(210, 119, 0.7, 23)}${hamster(180, 376, 0.39)}${ground}`,
  `<path d="m59 223 77-7m-59 29 49-4m-61 37 55-6m-35 35 42-5" stroke="${blood}" stroke-width="3"/>${hamster(214, 268, 1.1)}<path d="m109 367 53-4m-73 20 40-3m113-22 43-7m-34-3 24-5"/>${star(278, 151)}${ground}`,
  `<path d="m65 391 66-115 32 42 73-142 66 215Z" fill="url(#hatch)"/><path d="m196 253 40-77 35 113-35-21-17 18Z" fill="${paper}"/>${hamster(155, 344, 0.47)}<circle cx="118" cy="148" r="22" fill="${gold}"/>${star(279, 128)}${ground}`,
  `${hamster(142, 292, 0.95)}${envelope(218, 297, 0.9)}<path d="M255 262v-76q0-19-24-19h-23v64h47m-47-44h29m-17 44v155" fill="${paper}"/>${star(102, 153)}${star(274, 125)}${ground}`,
  `<circle cx="180" cy="241" r="105" fill="${paper}"/><path d="M94 261a88 88 0 0 1 173 0" stroke-width="5"/>${Array.from({ length: 9 }, (_, i) => `<path d="M180 159v15" transform="rotate(${i * 22.5 - 90} 180 247)"/>`).join("")}<path d="m180 247 49-59" stroke="${blood}" stroke-width="5"/><circle cx="180" cy="247" r="9" fill="${gold}"/><rect x="127" y="282" width="106" height="32" fill="url(#hatch)"/><path d="M145 288v20m17-20v20m18-20v20m18-20v20m17-20v20"/>${star(87, 126)}${star(276, 368)}${ground}`,
  `<path d="M111 140h137v228H111Z" fill="url(#hatch)"/><path d="M96 126h137v228H96Z" fill="${paper}"/><path d="M121 168h86m-86 17h86m-86 18h86m-86 18h45m-45 76h40m-40 17h40" stroke-width="1.5"/><circle cx="212" cy="284" r="45" fill="${blood}"/><path d="m190 282 15 17 31-35" stroke="${paper}" stroke-width="5"/>${star(264, 142)}${ground}`,
  `${moon(241, 155, 30)}<path d="M81 370q21-31 98-29 85-2 102 29l-24 18H104Z" fill="url(#hatch)"/><g transform="rotate(-72 180 295)">${hamster(180, 295, 0.85)}</g><path d="M118 170h22l-22 24h23m7-53h27l-27 30h28" stroke="${blood}"/>${star(88, 235)}${ground}`,
  `${wheel(180, 245, 117)}<path d="M95 325q75 9 163-1" stroke="${blood}"/>${star(113, 143)}${star(266, 156)}<path d="M154 249q24-18 48-2m-41 15 33-1" stroke-width="1.4"/>${ground}`,
  `<path d="M146 134h70v30l15 19v117q0 18-19 18h-63q-18 0-18-18V183l15-19Z" fill="${paper}"/><path d="M137 237h89v62q0 12-17 12h-53q-19 0-19-12Z" fill="${gold}" stroke="none"/><path d="M146 134v-17h70v17m-42 185v32l-27 25" stroke-width="4"/><path d="M131 202h100m-83-17v43m7 20v35" stroke-width="1.5"/>${hamster(246, 366, 0.45)}${star(92, 168)}${ground}`,
  `${hamster(180, 272, 1.3)}<path d="M117 271q17-28 38-8m50 0q19-20 38 4" stroke="${blood}"/>${seed(103, 187, 0.45, -45)}${seed(268, 197, 0.5, 50)}${seed(180, 131, 0.65)}${ground}`,
  `${arch}<path d="M105 384V200q0-46 75-68v240Z" fill="url(#hatch)"/><path d="M118 216v142m15-153v150m17-160v157" stroke-width="1.5"/><circle cx="163" cy="278" r="4" fill="${gold}"/>${hamster(217, 350, 0.52)}${star(207, 203)}${star(239, 263)}${ground}`,
  `<path d="M180 119q56 41 101 40v105q0 76-101 117Q79 340 79 264V159q47 0 101-40Z" fill="${gold}"/><path d="M180 136q52 36 84 36v92q0 64-84 99-84-35-84-99v-92q35 0 84-36Z" fill="${paper}"/>${hamster(180, 263, 0.88, "seed")}${star(68, 128)}${star(291, 134)}${ground}`,
  `${moon(181, 156, 40)}${star(87, 156)}${star(281, 202)}${star(113, 234)}<ellipse cx="181" cy="342" rx="110" ry="43"/><ellipse cx="181" cy="342" rx="94" ry="31" stroke="${blood}"/>${hamster(184, 321, 0.65)}<path d="m234 381 19-7m-141 7 17 4"/>`,
  `<path d="M180 222v164m0-42q-72-4-61-52 64 3 61 52m0-17q71-9 60-57-66 9-60 57" fill="url(#hatch)"/>${flower(180, 205, 1.02)}${hamster(94, 362, 0.34, "seed")}${seed(259, 361, 0.6, 35)}${ground}`,
  `<path d="m180 170 84 47v96l-84 48-84-48v-96Z" fill="url(#hatch)"/><path d="m180 170 84 47-84 47-84-47Z" fill="${gold}"/><path d="M180 264v97m-84-144 84 47 84-47"/><path d="m122 269 30 17m-30 0 30 17m59-12 29-17m-29 34 29-17" stroke-width="1.5"/>${star(109, 144)}${star(267, 145)}${ground}`,
  `<path d="M94 248q78 39 172 0l-17 129q-67 35-138 0Z" fill="url(#hatch)"/><ellipse cx="180" cy="248" rx="86" ry="28" fill="${paper}"/>${Array.from({ length: 13 }, (_, i) => seed(122 + (i % 5) * 28, 245 - Math.floor(i / 5) * 31, 0.7, ((i % 3) - 1) * 30)).join("")}<path d="M129 333q50 19 102 0m-99 12q45 17 96 0"/>${star(100, 153)}${star(272, 168)}${ground}`,
];
const romans = [
  "0",
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
  "XIII",
  "XIV",
  "XV",
  "XVI",
  "XVII",
  "XVIII",
  "XIX",
  "XX",
  "XXI",
];
await mkdir("public/cards", { recursive: true });
for (let i = 0; i < scenes.length; i++) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 500" width="360" height="500"><defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(25)"><rect width="6" height="6" fill="${paper}"/><path d="M0 0V6" stroke="${ink}" stroke-width=".7"/></pattern></defs><rect width="360" height="500" rx="9" fill="${paper}"/><g fill="none" stroke="${ink}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="13" y="13" width="334" height="474" rx="5"/><path d="M25 77V25h114m82 0h114v52M25 423v52h114m82 0h114v-52" stroke-width="1"/><path d="M37 91V37h80m126 0h80v54M37 409v54h80m126 0h80v-54" stroke="${gold}" stroke-width="1"/><circle cx="180" cy="52" r="24" fill="${paper}" stroke="${blood}"/>${scenes[i]}<path d="M88 440h60m64 0h60" stroke-width="1"/>${star(180, 440, 11)}${star(37, 37, 6)}${star(323, 37, 6)}${star(37, 463, 6)}${star(323, 463, 6)}</g><text x="180" y="59" fill="${blood}" font-size="20" font-family="Georgia,serif" text-anchor="middle">${romans[i]}</text></svg>`;
  await writeFile(`public/cards/${String(i).padStart(2, "0")}.svg`, svg);
}
const back = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 360 500"><defs><pattern id="dots" width="24" height="24" patternUnits="userSpaceOnUse"><path d="m12 5 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="${gold}"/></pattern></defs><rect width="360" height="500" rx="9" fill="${blood}"/><rect x="14" y="14" width="332" height="472" rx="5" fill="url(#dots)" stroke="${gold}"/><g stroke="${gold}" fill="${blood}"><ellipse cx="180" cy="250" rx="112" ry="163" stroke-width="2"/><circle cx="180" cy="250" r="82" stroke-width="4"/><circle cx="180" cy="250" r="69" stroke-width="1"/><path d="M180 332v38m-45 0h90" stroke-width="4"/>${star(180, 250, 40)}</g></svg>`;
await writeFile("public/cards/back.svg", back);
await writeFile(
  "public/favicon.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="${blood}"/><g fill="none" stroke="${paper}" stroke-width="3"><circle cx="32" cy="28" r="22"/><path d="M32 50v6m-13 0h26"/></g><path d="M22 32q-4-16 3-13l6 3 8-3q7-3 3 13-1 11-10 11T22 32" fill="${gold}"/><circle cx="28" cy="31" r="1.6" fill="${ink}"/><circle cx="37" cy="31" r="1.6" fill="${ink}"/></svg>`,
);
await writeFile(
  "public/og-image.svg",
  `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><rect width="1200" height="630" fill="${paper}"/><path d="M50 50h1100v530H50Z" fill="none" stroke="${blood}" stroke-width="2"/><text x="110" y="150" font-family="Georgia,serif" font-size="46" fill="${blood}">Squeekscope</text><text x="110" y="285" font-family="Georgia,serif" font-size="76" fill="${ink}">A little wheel</text><text x="110" y="370" font-family="Georgia,serif" font-size="76" fill="${ink}">of fate.</text><text x="110" y="459" font-family="Arial,sans-serif" font-size="27" fill="${ink}">Daily hamster tarot for any Ethereum address.</text><g transform="translate(720 60) scale(.95)" stroke="${ink}" stroke-width="2.2" fill="none">${wheel(180, 233, 135)}${hamster(180, 288, 1.05, "seed")}${star(72, 100)}${star(290, 107)}</g></svg>`,
);
console.log(
  "Wrote 22 original card SVGs, card back, favicon and share artwork.",
);
