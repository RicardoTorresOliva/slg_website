import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const [src, out] = process.argv.slice(2);
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 627 } });
for (const f of fs.readdirSync(src).filter((f) => f.endsWith(".html"))) {
  await page.goto("file://" + path.join(src, f));
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(out, f.replace(".html", ".png")) });
  console.log(f);
}
await browser.close();
