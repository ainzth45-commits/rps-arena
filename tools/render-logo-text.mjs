import { chromium } from "playwright";
const S = "/private/tmp/claude-501/-Users-iceth-Desktop-----------------/c507c42d-8d4e-4771-a216-9f8dff632957/scratchpad";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 2200, height: 1200 }, deviceScaleFactor: 2 });
await p.goto(`file://${S}/logo-text.html`);
await p.waitForTimeout(700);
await p.locator(".wrap").screenshot({ path: `${S}/logo-text.png`, omitBackground: true });
await b.close();
