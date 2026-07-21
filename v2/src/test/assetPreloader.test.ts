import { describe, expect, it } from "vitest";
import { preloadAssets } from "../preload/assetPreloader";
import { assetUrl, gameAssetUrls } from "../preload/gameAssets";

describe("asset preloader", () => {
  it("counts failed images as completed so progress reaches 100 percent", async () => {
    const progress: number[] = [];

    const result = await preloadAssets(["ok-a.png", "broken.png", "ok-b.png"], {
      concurrency: 2,
      loadAsset: async (path) => {
        if (path === "broken.png") {
          throw new Error("image missing");
        }
      },
      onProgress: (state) => progress.push(state.percent)
    });

    expect(result).toEqual({
      total: 3,
      completed: 3,
      failed: 1,
      percent: 100,
      ready: true
    });
    expect(progress[progress.length - 1]).toBe(100);
  });

  it("marks ready only after every image has settled and never exceeds the configured loading lanes", async () => {
    let active = 0;
    let maxActive = 0;
    const states: Array<{ completed: number; ready: boolean }> = [];

    const result = await preloadAssets(["a.png", "b.png", "c.png", "d.png", "e.png"], {
      concurrency: 2,
      loadAsset: async () => {
        active += 1;
        maxActive = Math.max(maxActive, active);
        await Promise.resolve();
        active -= 1;
      },
      onProgress: (state) => states.push({ completed: state.completed, ready: state.ready })
    });

    expect(maxActive).toBeLessThanOrEqual(2);
    expect(states.slice(0, -1).every((state) => state.ready === false)).toBe(true);
    expect(result.ready).toBe(true);
    expect(result.completed).toBe(5);
  });

  it("uses the same asset URL helper for preload and display without duplicating the assets prefix", () => {
    const urls = gameAssetUrls("./");
    const crownUrl = assetUrl("icons/crown.webp", "./");

    expect(crownUrl).toBe("./assets/icons/crown.webp");
    expect(urls).toContain(crownUrl);
    expect(urls.every((url) => !url.includes("assets/assets"))).toBe(true);
  });
});
