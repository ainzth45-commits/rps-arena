import { describe, expect, it } from "vitest";
import { assetUrl, gameAssetUrls } from "../preload/assets";
import { preloadAssets } from "../preload/preloader";

describe("asset preloader", () => {
  it("counts failed images as completed so the gate can reach 100 percent", async () => {
    const progress: number[] = [];
    const result = await preloadAssets(["ok-a.png", "broken.png", "ok-b.png"], {
      concurrency: 2,
      loadAsset: async (path) => {
        if (path === "broken.png") throw new Error("missing");
      },
      onProgress: (state) => progress.push(state.percent),
    });

    expect(result).toEqual({ total: 3, completed: 3, failed: 1, percent: 100, ready: true });
    expect(progress[progress.length - 1]).toBe(100);
  });

  it("keeps preload and display URLs under the static base path without assets/assets duplication", () => {
    expect(assetUrl("icons/crown.webp", "./")).toBe("./assets/icons/crown.webp");
    expect(gameAssetUrls("./")).toContain("./assets/icons/crown.webp");
    expect(gameAssetUrls("./").every((url) => !url.includes("assets/assets"))).toBe(true);
  });
});
