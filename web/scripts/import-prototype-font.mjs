import { mkdir, readFile, writeFile } from "node:fs/promises";

// Preserve the prototype's embedded lettering as a locally served font.
const source = await readFile(process.argv[2] || "/prototype.html", "utf8");
const match = source.match(
  /@font-face\{font-family:"Display";src:url\(data:font\/woff2;base64,([^)]+)\)/,
);
if (!match) throw new Error("The prototype Display font was not found");
await mkdir("public/fonts", { recursive: true });
await writeFile("public/fonts/display.woff2", Buffer.from(match[1], "base64"));
console.log("Imported the original prototype Display font.");
