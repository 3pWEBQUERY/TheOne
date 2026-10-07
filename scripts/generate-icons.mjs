// Renders the SVG app icon into the PNG sizes needed for the PWA manifest & iOS.
import sharp from "sharp";
import { readFile } from "node:fs/promises";

const svg = await readFile(new URL("../public/icons/icon.svg", import.meta.url));
const out = (p) => new URL(`../public/${p}`, import.meta.url).pathname;

await sharp(svg).resize(192, 192).png().toFile(out("icons/icon-192.png"));
await sharp(svg).resize(512, 512).png().toFile(out("icons/icon-512.png"));
await sharp(svg).resize(180, 180).png().toFile(out("apple-touch-icon.png"));
// maskable: the artwork already keeps its content inside the 80% safe zone
await sharp(svg).resize(512, 512).png().toFile(out("icons/maskable-512.png"));
await sharp(svg).resize(96, 96).png().toFile(out("icons/badge-96.png"));
console.log("Icons erstellt.");
