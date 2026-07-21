import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = resolve(__dirname, "../..");

describe("empty state layout guards", () => {
  it("renders empty state text with a full-width class instead of a single grid column", () => {
    const app = readFileSync(resolve(root, "src/App.tsx"), "utf8");

    expect(app).toContain('<p className="empty-state">ยังไม่มีผู้เล่น');
    expect(app).toContain('<p className="empty-state">ไม่มีใครมาท้า');
    expect(app).toContain('<p className="empty-state">อีก {ranked[0]?.unrankedCount}');
  });

  it("forces empty state messages to span every grid column and keep readable width", () => {
    const css = readFileSync(resolve(root, "src/styles.css"), "utf8");

    expect(css).toMatch(/\.empty-state\s*\{[^}]*grid-column:\s*1\s*\/\s*-1;/s);
    expect(css).toMatch(/\.empty-state\s*\{[^}]*width:\s*100%;/s);
    expect(css).toMatch(/\.empty-state\s*\{[^}]*min-width:\s*0;/s);
  });
});
