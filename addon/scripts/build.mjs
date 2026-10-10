import * as esbuild from "esbuild";
import { cpSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

await esbuild.build({
  entryPoints: [join(root, "src/main.ts")],
  bundle: true,
  outfile: join(dist, "Code.js"),
  platform: "neutral",
  format: "iife",
  target: ["es2019"],
  legalComments: "none",
  logLevel: "info",
});

cpSync(join(root, "src/appsscript.json"), join(dist, "appsscript.json"));
cpSync(join(root, "src/ui/Sidebar.html"), join(dist, "Sidebar.html"));

// Inject brand name into sidebar HTML from brand.ts constant when present
const brandSrc = readFileSync(join(root, "src/lib/brand.ts"), "utf8");
const nameMatch = brandSrc.match(/name:\s*"([^"]+)"/);
if (nameMatch) {
  const sidebar = readFileSync(join(dist, "Sidebar.html"), "utf8").replace(
    /<span id="brandName">[^<]*<\/span>/,
    `<span id="brandName">${nameMatch[1]}</span>`,
  );
  writeFileSync(join(dist, "Sidebar.html"), sidebar);
}

console.log("Built clasp bundle → addon/dist/");
