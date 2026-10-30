import { cardImage, COLOURS, DECK } from "./deck";
import type { Reading } from "./reading";
export async function saveReadingImage(reading: Reading): Promise<void> {
  await document.fonts.ready;
  const image = new Image();
  image.src = new URL(cardImage(reading.index), document.baseURI).href;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable.");
  const paper = "#f5efdf",
    ink = "#25241f",
    blood = "#742f36",
    gold = "#bd8b2d";
  ctx.fillStyle = paper;
  ctx.fillRect(0, 0, 1080, 1350);
  ctx.strokeStyle = blood;
  ctx.lineWidth = 2;
  ctx.strokeRect(32, 32, 1016, 1286);
  ctx.fillStyle = blood;
  ctx.textAlign = "center";
  ctx.font = "500 48px Fraunces, Georgia, serif";
  ctx.fillText("Squeekscope", 540, 108);
  ctx.fillStyle = ink;
  ctx.font = '400 24px "DM Sans", Arial, sans-serif';
  ctx.fillText(
    `${reading.day} · ${reading.reversed ? "Reversed" : "Upright"}${reading.provisional ? " · Provisional" : ""}`,
    540,
    157,
  );
  ctx.save();
  ctx.translate(540, 488);
  if (reading.reversed) ctx.rotate(Math.PI);
  ctx.drawImage(image, -205, -285, 410, 570);
  ctx.restore();
  ctx.font = "400 56px Fraunces, Georgia, serif";
  ctx.fillStyle = ink;
  ctx.fillText(DECK[reading.index].name, 540, 858);
  function wrapped(text: string, y: number, width: number, lineHeight: number) {
    const words = text.split(" ");
    let line = "";
    for (const word of words) {
      if (ctx!.measureText(`${line} ${word}`).width > width && line) {
        ctx!.fillText(line, 540, y);
        y += lineHeight;
        line = word;
      } else line += `${line ? " " : ""}${word}`;
    }
    if (line) ctx!.fillText(line, 540, y);
    return y;
  }
  ctx.font = '400 32px "DM Sans", Arial, sans-serif';
  const lastReading = wrapped(
    reading.reversed
      ? DECK[reading.index].reversed
      : DECK[reading.index].upright,
    921,
    860,
    44,
  );
  ctx.font = "italic 400 29px Fraunces, Georgia, serif";
  ctx.fillStyle = blood;
  wrapped(DECK[reading.index].omen, Math.max(1038, lastReading + 62), 850, 38);
  ctx.strokeStyle = gold;
  ctx.beginPath();
  ctx.moveTo(160, 1122);
  ctx.lineTo(920, 1122);
  ctx.stroke();
  ctx.fillStyle = ink;
  ctx.font = '500 27px "DM Sans", Arial, sans-serif';
  ctx.fillText(
    `Round #${reading.luckyRound}  ·  ${COLOURS[reading.colourIndex].name}`,
    540,
    1172,
  );
  ctx.font = '400 25px "DM Sans", Arial, sans-serif';
  ctx.fillText(
    `Wheel energy: ${reading.energy.toLocaleString("en-GB")} work`,
    540,
    1212,
  );
  ctx.font = '400 23px "DM Sans", Arial, sans-serif';
  ctx.fillText(reading.subject, 540, 1264);
  ctx.font = '400 21px "DM Sans", Arial, sans-serif';
  ctx.fillStyle = blood;
  ctx.fillText("A little wheel of fate. · Ethereum Sepolia", 540, 1303);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (value) =>
        value ? resolve(value) : reject(new Error("PNG export failed.")),
      "image/png",
    ),
  );
  const url = URL.createObjectURL(blob),
    link = document.createElement("a");
  link.href = url;
  link.download = `squeekscope-${reading.day}-${reading.subject.slice(0, 8)}.png`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
