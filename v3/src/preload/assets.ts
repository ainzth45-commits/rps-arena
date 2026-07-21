const DEFAULT_BASE = import.meta.env?.BASE_URL ?? "./";

export const GAME_ASSET_PATHS = [
  "logo.png",
  "bg-arena.png",
  "home-title.png",
  "moves/rock.webp",
  "moves/paper.webp",
  "moves/scissors.webp",
  "chars/cat-smug.webp",
  "chars/cat-win.webp",
  "chars/cat-lose.webp",
  "chars/employee-angry.webp",
  "chars/employee-win.webp",
  "chars/employee-lose.webp",
  "icons/avatar-placeholder.webp",
  "icons/crown.webp",
  "icons/icon-coin.webp",
  "icons/icon-dice.webp",
  "icons/icon-duel.webp",
  "icons/icon-history.webp",
  "icons/icon-home.webp",
  "icons/icon-lock.webp",
  "icons/icon-mail.webp",
  "icons/icon-moveset.webp",
  "icons/icon-offround.webp",
  "icons/icon-players.webp",
  "icons/icon-ranking.webp",
  "icons/icon-settings.webp",
  "icons/icon-timer.webp",
  "icons/icon-tutorial.webp",
  "icons/icon-warning.webp",
  "scenes/bg-moveset.webp",
  "scenes/bg-prep.webp",
  "scenes/bg-result.webp",
  "scenes/bg-versus.webp",
  "scenes/bg-versus-left.webp",
  "scenes/bg-versus-right.webp",
  "scenes/clash-spark.webp",
  "scenes/result-draw.webp",
  "scenes/result-lose.webp",
  "scenes/result-win.webp",
  "scenes/season-podium.webp",
  "scenes/season-trophy.webp",
  "scenes/streak-fire.webp",
  "scenes/tutorial-duel.webp",
  "scenes/tutorial-moveset.webp",
  "scenes/tutorial-pointer.webp",
  "scenes/vs-badge.webp",
] as const;

export function assetUrl(path: string, base = DEFAULT_BASE): string {
  const normalized = base.endsWith("/") ? base : `${base}/`;
  return `${normalized}assets/${path}`;
}

export function gameAssetUrls(base = DEFAULT_BASE): string[] {
  return GAME_ASSET_PATHS.map((path) => assetUrl(path, base));
}

export const asset = (path: string) => assetUrl(path);
