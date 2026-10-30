export interface Card {
  name: string;
  upright: string;
  reversed: string;
  omen: string;
  theme: string;
}
export const DECK: readonly Card[] = [
  {
    name: "The Hamster",
    theme: "Beginnings",
    upright: "Trust your small feet; the first lap belongs to you.",
    reversed: "A hesitant start is still a start; leave the bedding behind.",
    omen: "A small door opens before you knock.",
  },
  {
    name: "The Wheel",
    theme: "Momentum",
    upright: "Keep a steady rhythm; the world will turn with you.",
    reversed: "You can step off a circle that no longer takes you anywhere.",
    omen: "An old rhythm returns with a new meaning.",
  },
  {
    name: "The Seed",
    theme: "Possibility",
    upright: "Plant one modest intention and give it room to grow.",
    reversed: "Stop digging up your plans to see if they have roots.",
    omen: "Something overlooked is ready to sprout.",
  },
  {
    name: "The Burrow",
    theme: "Belonging",
    upright: "Build a little shelter for the things you want to keep.",
    reversed: "Comfort becomes a cage when you never leave it.",
    omen: "A familiar place holds an unfamiliar answer.",
  },
  {
    name: "The Night Shift",
    theme: "Quiet work",
    upright: "Let your quiet effort count, even when nobody is watching.",
    reversed: "Rest is part of the work; the dark does not need all of you.",
    omen: "A useful thought arrives after the noise fades.",
  },
  {
    name: "The Reporter",
    theme: "Clarity",
    upright: "Say what you observed; the plain truth has its own weight.",
    reversed: "Check the story before you carry it to the next burrow.",
    omen: "A message makes the missing piece visible.",
  },
  {
    name: "The Magnet",
    theme: "Attraction",
    upright: "Move toward what draws you without forgetting your own centre.",
    reversed: "Not everything that pulls you deserves your attention.",
    omen: "Two unlikely things find their way together.",
  },
  {
    name: "The Sprint",
    theme: "Courage",
    upright: "Take the opening; a brief burst can break a long hesitation.",
    reversed: "Speed will not fix a direction you have not chosen.",
    omen: "Your next opportunity has a short runway.",
  },
  {
    name: "The Difficulty",
    theme: "Resistance",
    upright:
      "Meet the resistance with patience; strength grows one lap at a time.",
    reversed: "An easier route can still lead somewhere worth going.",
    omen: "A stubborn obstacle reveals a handhold.",
  },
  {
    name: "The Postman",
    theme: "Connection",
    upright: "Send the kind word you have been carrying around.",
    reversed: "A delayed answer is an invitation to listen, not to assume.",
    omen: "News travels by an unexpected route.",
  },
  {
    name: "The Odometer",
    theme: "Perspective",
    upright: "Look back at the distance; your little steps have added up.",
    reversed: "A number can mark your progress without measuring your worth.",
    omen: "A milestone appears in the rear view.",
  },
  {
    name: "The Settlement",
    theme: "Resolution",
    upright:
      "Let a finished thing be finished, and make room for the next lap.",
    reversed: "Leave the ledger open until the missing detail is clear.",
    omen: "What was pending finally finds its place.",
  },
  {
    name: "The Nap",
    theme: "Rest",
    upright: "Put down the sunflower seed; the world can wait a little.",
    reversed: "Wake gently; what you avoided is smaller in the daylight.",
    omen: "An answer settles while you are doing nothing.",
  },
  {
    name: "The Empty Wheel",
    theme: "Space",
    upright: "An empty space is not a failure; it is room for something new.",
    reversed:
      "Return to a neglected joy before the habit of absence takes hold.",
    omen: "Silence makes one small invitation audible.",
  },
  {
    name: "The Water Bottle",
    theme: "Renewal",
    upright: "Tend to your simplest need before solving the complicated one.",
    reversed: "You cannot pour from a bottle you keep forgetting to refill.",
    omen: "Relief arrives through an ordinary kindness.",
  },
  {
    name: "The Cheek Pouch",
    theme: "Enough",
    upright: "Keep a little in reserve, and share what you can spare.",
    reversed: "Make room by releasing something you no longer need to carry.",
    omen: "A forgotten reserve proves useful.",
  },
  {
    name: "The Cage Door",
    theme: "Freedom",
    upright: "The latch is open; decide what freedom means to you.",
    reversed: "Check whether the boundary is real or simply familiar.",
    omen: "A choice appears where you expected a wall.",
  },
  {
    name: "The Guardian",
    theme: "Care",
    upright: "Protect what is tender without holding it too tightly.",
    reversed:
      "Let someone help; care does not have to travel in one direction.",
    omen: "A steady presence makes a difficult moment smaller.",
  },
  {
    name: "The Midnight Lap",
    theme: "Instinct",
    upright: "Follow the quiet signal that survives when the room goes dark.",
    reversed: "Wait for your eyes to adjust before you call a shadow a threat.",
    omen: "One more lap brings a different view of the moon.",
  },
  {
    name: "The Sunflower",
    theme: "Warmth",
    upright: "Turn toward the generous thing and let it brighten your day.",
    reversed: "You do not have to bloom on somebody else’s schedule.",
    omen: "A small kindness grows more seeds than expected.",
  },
  {
    name: "The Block",
    theme: "Progress",
    upright:
      "Lay one solid piece; a lasting structure is built in small units.",
    reversed: "Rebuild the loose foundation before adding another level.",
    omen: "Many small efforts become one visible thing.",
  },
  {
    name: "The Hoard",
    theme: "Abundance",
    upright: "Enjoy what you have gathered; abundance is allowed to be shared.",
    reversed: "Ask what you are saving for, and whether that day has arrived.",
    omen: "A treasure is found in something you already have.",
  },
];
export const COLOURS = [
  { name: "Sunflower gold", hex: "#bd8b2d" },
  { name: "Oxblood", hex: "#742f36" },
  { name: "Bedding ivory", hex: "#efe3ca" },
  { name: "Midnight blue", hex: "#283953" },
  { name: "Moss green", hex: "#596a43" },
  { name: "Clay red", hex: "#a2583f" },
  { name: "Lavender", hex: "#a39aba" },
  { name: "Wheel silver", hex: "#9a9e9e" },
  { name: "Seed brown", hex: "#745339" },
  { name: "Rose pink", hex: "#ca9292" },
  { name: "Water blue", hex: "#7cabb8" },
  { name: "Ink black", hex: "#25241f" },
] as const;
export const cardImage = (index: number) =>
  `./cards/${String(index).padStart(2, "0")}.svg`;
export function roman(n: number): string {
  if (n === 0) return "0";
  let out = "";
  for (const [value, glyph] of [
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ] as const) {
    while (n >= value) {
      out += glyph;
      n -= value;
    }
  }
  return out;
}
