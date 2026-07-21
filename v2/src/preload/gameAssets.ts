export const GAME_ASSET_PATHS = [
  "bg-arena.png",
  "chars/cat-lose.webp",
  "chars/cat-smug.webp",
  "chars/cat-win.webp",
  "chars/employee-angry.webp",
  "chars/employee-lose.webp",
  "chars/employee-win.webp",
  "home-title.png",
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
  "logo.png",
  "moves/paper.webp",
  "moves/rock.webp",
  "moves/scissors.webp",
  "scenes/bg-moveset.webp",
  "scenes/bg-prep.webp",
  "scenes/bg-result.webp",
  "scenes/bg-versus-left.webp",
  "scenes/bg-versus-right.webp",
  "scenes/bg-versus.webp",
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
  "scenes/vs-badge.webp"
];

export function assetUrl(path: string, baseUrl = import.meta.env.BASE_URL): string {
  const base = baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`;
  return `${base}assets/${normalizeAssetPath(path)}`;
}

export function gameAssetUrls(baseUrl = import.meta.env.BASE_URL): string[] {
  return GAME_ASSET_PATHS.map((path) => assetUrl(path, baseUrl));
}

function normalizeAssetPath(path: string): string {
  return path.replace(/^\.?\//, "").replace(/^assets\//, "");
}
