export interface AssetPreloadState {
  total: number;
  completed: number;
  failed: number;
  percent: number;
  ready: boolean;
}

export interface AssetPreloadOptions {
  concurrency: number;
  loadAsset: (path: string) => Promise<void>;
  onProgress?: (state: AssetPreloadState) => void;
}

export async function preloadAssets(paths: string[], options: AssetPreloadOptions): Promise<AssetPreloadState> {
  const total = paths.length;
  const laneCount = Math.max(1, Math.min(options.concurrency, Math.max(total, 1)));
  let completed = 0;
  let failed = 0;
  let cursor = 0;

  if (total === 0) {
    const empty = snapshot(total, completed, failed);
    options.onProgress?.(empty);
    return empty;
  }

  async function worker() {
    while (cursor < total) {
      const path = paths[cursor];
      cursor += 1;
      try {
        await options.loadAsset(path);
      } catch {
        failed += 1;
      } finally {
        completed += 1;
        options.onProgress?.(snapshot(total, completed, failed));
      }
    }
  }

  await Promise.all(Array.from({ length: laneCount }, () => worker()));
  return snapshot(total, completed, failed);
}

export function loadBrowserImage(path: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => reject(new Error(`โหลดรูปไม่สำเร็จ: ${path}`));
    image.src = path;
  });
}

function snapshot(total: number, completed: number, failed: number): AssetPreloadState {
  return {
    total,
    completed,
    failed,
    percent: total === 0 ? 100 : Math.round((completed / total) * 100),
    ready: completed >= total
  };
}
