import playwright from '../app/node_modules/playwright/index.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'theme-samples');
const { chromium } = playwright;

const W = 1536;
const H = 1024;

function burst(id, cx, cy, r1, r2, points = 12, rotation = 0) {
  const pts = [];
  for (let i = 0; i < points * 2; i += 1) {
    const a = rotation + (Math.PI * i) / points;
    const r = i % 2 === 0 ? r2 : r1;
    pts.push(`${(cx + Math.cos(a) * r).toFixed(1)},${(cy + Math.sin(a) * r).toFixed(1)}`);
  }
  return `<polygon id="${id}" points="${pts.join(' ')}" />`;
}

function star(cx, cy, size, color, rot = -0.3) {
  return `<g transform="translate(${cx} ${cy}) rotate(${rot * 57.3})">
    <path d="M0 ${-size} L${size * .28} ${-size * .25} L${size} 0 L${size * .28} ${size * .25} L0 ${size} L${-size * .28} ${size * .25} L${-size} 0 L${-size * .28} ${-size * .25}Z"
      fill="${color}" stroke="#061138" stroke-width="${Math.max(5, size * .13)}" stroke-linejoin="round"/>
  </g>`;
}

function lightning(points, fill = '#fff', stroke = '#061138', sw = 14) {
  return `<polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
}

function rope(x1, y1, x2, y2, color) {
  return `<g stroke-linecap="round">
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#061138" stroke-width="26"/>
    <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="14"/>
    <line x1="${x1}" y1="${y1 - 10}" x2="${x2}" y2="${y2 - 10}" stroke="#fff8d8" stroke-width="4" opacity=".9"/>
  </g>`;
}

function cat(x, y, s = 1, mood = 'smirk') {
  return `<g transform="translate(${x} ${y}) scale(${s})" stroke="#061138" stroke-linecap="round" stroke-linejoin="round">
    <path d="M-144 6 C-150 -112 -58 -172 54 -158 C158 -146 220 -78 204 30 C188 140 80 182 -42 154 C-106 140 -136 88 -144 6Z" fill="#f6a20b" stroke-width="16"/>
    <path d="M-116 -78 L-164 -180 L-44 -126Z" fill="#f6a20b" stroke-width="16"/>
    <path d="M102 -126 L206 -188 L176 -70Z" fill="#f6a20b" stroke-width="16"/>
    <path d="M-105 -105 L-132 -157 L-68 -129Z" fill="#ff8fab" stroke-width="7"/>
    <path d="M127 -128 L177 -158 L160 -94Z" fill="#ff8fab" stroke-width="7"/>
    <ellipse cx="10" cy="38" rx="118" ry="84" fill="#ffd98b" stroke-width="0"/>
    <path d="M-75 -80 C-42 -64 -5 -60 35 -74" fill="none" stroke="#c56a00" stroke-width="12"/>
    <path d="M-94 -22 C-68 -44 -38 -44 -12 -24" fill="none" stroke-width="12"/>
    <path d="M78 -24 C105 -45 139 -43 164 -20" fill="none" stroke-width="12"/>
    <ellipse cx="-42" cy="-8" rx="16" ry="20" fill="#061138" stroke-width="0"/>
    <ellipse cx="106" cy="-6" rx="16" ry="20" fill="#061138" stroke-width="0"/>
    <path d="M19 24 C37 18 53 20 64 30 C52 44 34 45 19 24Z" fill="#ff6d5a" stroke-width="8"/>
    <path d="M-6 54 C34 90 86 84 116 48" fill="none" stroke-width="10"/>
    <path d="M-78 44 L-160 22 M-78 70 L-164 72 M100 42 L184 20 M101 69 L182 74" stroke-width="7"/>
    <path d="M-118 130 C-200 134 -218 216 -142 222 C-92 226 -70 188 -86 150Z" fill="#ffd38b" stroke-width="15"/>
    <path d="M134 126 C212 142 218 222 148 224 C96 225 74 186 96 148Z" fill="#ffd38b" stroke-width="15"/>
    ${mood === 'wink' ? '<path d="M70 -20 C98 -40 132 -38 160 -18" fill="none" stroke-width="12"/>' : ''}
  </g>`;
}

function human(x, y, s = 1) {
  return `<g transform="translate(${x} ${y}) scale(${s})" stroke="#061138" stroke-linecap="round" stroke-linejoin="round">
    <path d="M-94 130 C-78 58 -58 4 -2 -14 C58 -34 126 -10 154 60 C178 118 130 176 42 184 C-44 192 -110 174 -94 130Z" fill="#0f2c68" stroke-width="16"/>
    <circle cx="16" cy="2" r="96" fill="#ffb37d" stroke-width="15"/>
    <path d="M-72 -34 C-18 -132 94 -124 136 -44 C58 -60 4 -56 -72 -34Z" fill="#7a3b11" stroke-width="15"/>
    <path d="M72 -96 C156 -86 210 -18 196 72 C152 18 110 -12 64 -28Z" fill="#8f4715" stroke-width="15"/>
    <path d="M-42 -10 L4 12 M96 -4 L48 15" stroke-width="12"/>
    <ellipse cx="-20" cy="28" rx="17" ry="23" fill="#fff" stroke-width="8"/>
    <ellipse cx="76" cy="30" rx="17" ry="23" fill="#fff" stroke-width="8"/>
    <circle cx="-17" cy="32" r="7" fill="#061138" stroke-width="0"/>
    <circle cx="73" cy="34" r="7" fill="#061138" stroke-width="0"/>
    <path d="M12 80 C46 58 84 68 110 104" fill="#fff4e9" stroke-width="10"/>
    <path d="M15 83 C48 80 78 88 104 105" stroke-width="8"/>
    <circle cx="-78" cy="72" r="13" fill="#ff727f" stroke-width="0" opacity=".72"/>
    <circle cx="118" cy="76" r="13" fill="#ff727f" stroke-width="0" opacity=".72"/>
    <path d="M136 -10 l22 -22 M152 8 l30 -4 M135 27 l23 22" fill="none" stroke="#fff" stroke-width="8"/>
    <path d="M-138 132 C-218 120 -246 204 -172 220 C-118 232 -100 184 -112 150Z" fill="#ffb37d" stroke-width="15"/>
  </g>`;
}

function fist(x, y, s = 1, wrist = '#109bea') {
  return `<g transform="translate(${x} ${y}) scale(${s})" stroke="#061138" stroke-linecap="round" stroke-linejoin="round">
    <path d="M-54 88 L-46 138 L62 136 L66 83Z" fill="${wrist}" stroke-width="13"/>
    <path d="M-88 22 C-92 -27 -55 -55 -22 -36 C-16 -82 39 -85 52 -42 C74 -72 122 -55 119 -13 C151 -20 174 14 156 50 C140 88 94 102 48 104 L-26 102 C-62 99 -84 69 -88 22Z" fill="#ffbf86" stroke-width="14"/>
    <path d="M-24 -33 C-19 0 -5 22 24 23 M52 -39 C54 -4 68 22 96 22 M117 -9 C111 20 122 42 151 45 M-73 40 C-32 44 -3 62 16 93" fill="none" stroke-width="7"/>
  </g>`;
}

function scissors(x, y, s = 1, wrist = '#8b57ff') {
  return `<g transform="translate(${x} ${y}) scale(${s})" stroke="#061138" stroke-linecap="round" stroke-linejoin="round">
    <path d="M-28 100 L-30 150 L74 150 L70 98Z" fill="${wrist}" stroke-width="13"/>
    <path d="M-18 14 C-26 -76 2 -126 36 -116 C70 -108 62 -48 48 12" fill="#ffbf86" stroke-width="14"/>
    <path d="M50 22 C72 -56 116 -96 145 -76 C179 -54 141 6 94 48" fill="#ffbf86" stroke-width="14"/>
    <path d="M-66 48 C-78 2 -45 -31 -10 -12 L73 34 C113 58 112 118 56 128 L-6 125 C-42 120 -58 85 -66 48Z" fill="#ffbf86" stroke-width="14"/>
    <path d="M2 38 C25 50 44 66 53 104 M38 14 C55 25 70 38 82 54 M-42 58 C-12 58 11 73 22 101" fill="none" stroke-width="7"/>
  </g>`;
}

function palm(x, y, s = 1, wrist = '#ff3baa') {
  return `<g transform="translate(${x} ${y}) scale(${s})" stroke="#061138" stroke-linecap="round" stroke-linejoin="round">
    <path d="M-34 112 L-30 164 L82 162 L80 107Z" fill="${wrist}" stroke-width="13"/>
    <path d="M-76 56 C-92 22 -66 -8 -35 3 L-18 12 L-16 -66 C-14 -101 30 -104 35 -64 L42 2 L52 -72 C58 -111 104 -106 104 -66 L101 8 L124 -48 C139 -84 181 -67 171 -30 L147 45 C185 18 217 51 190 82 L132 143 C108 169 56 175 13 154 C-35 131 -55 93 -76 56Z" fill="#ffbf86" stroke-width="14"/>
    <path d="M41 4 L35 72 M101 10 L91 78 M146 46 L120 94 M-20 50 C10 56 32 78 40 112" fill="none" stroke-width="7"/>
  </g>`;
}

function textChunk({ text, x, y, size, rotate = 0, fill = 'url(#goldFill)', scaleX = 1, scaleY = 1, anchor = 'middle' }) {
  const common = `x="${x}" y="${y}" text-anchor="${anchor}" font-family="'Sukhumvit Set','Thonburi','Arial Rounded MT Bold',sans-serif" font-size="${size}" font-weight="900" letter-spacing="0" transform="rotate(${rotate} ${x} ${y}) scale(${scaleX} ${scaleY})"`;
  return `<g class="logo-word">
    <text ${common} dx="18" dy="22" fill="#030a26" stroke="#030a26" stroke-width="40" stroke-linejoin="round" paint-order="stroke fill" opacity=".95">${text}</text>
    <text ${common} fill="#fff7d8" stroke="#fff7d8" stroke-width="42" stroke-linejoin="round" paint-order="stroke fill">${text}</text>
    <text ${common} fill="#071443" stroke="#071443" stroke-width="27" stroke-linejoin="round" paint-order="stroke fill">${text}</text>
    <text ${common} fill="${fill}" stroke="#ff2fb3" stroke-width="8" stroke-linejoin="round" paint-order="stroke fill">${text}</text>
  </g>`;
}

function defs() {
  return `<defs>
    <linearGradient id="goldFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff7a2"/><stop offset=".42" stop-color="#ffd633"/><stop offset=".75" stop-color="#ff9f26"/><stop offset="1" stop-color="#ff5da8"/>
    </linearGradient>
    <linearGradient id="pinkFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#fff2ff"/><stop offset=".28" stop-color="#ff73d3"/><stop offset=".72" stop-color="#cf47ff"/><stop offset="1" stop-color="#54c6ff"/>
    </linearGradient>
    <linearGradient id="blueFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c9fbff"/><stop offset=".38" stop-color="#2fc7ff"/><stop offset=".75" stop-color="#3869ff"/><stop offset="1" stop-color="#cc40ff"/>
    </linearGradient>
    <filter id="pop" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="18" stdDeviation="0" flood-color="#030a26" flood-opacity=".95"/>
      <feDropShadow dx="0" dy="4" stdDeviation="0" flood-color="#ffffff" flood-opacity=".25"/>
    </filter>
  </defs>`;
}

function artOne() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${defs()}
    <g opacity=".98">
      ${burst('main-burst', 768, 518, 238, 365, 18, -0.08)}
      <use href="#main-burst" fill="#fff" stroke="#061138" stroke-width="24" stroke-linejoin="round"/>
      <use href="#main-burst" fill="#ff2ca7" transform="scale(.94 .88) translate(50 72)" opacity=".95"/>
      <use href="#main-burst" fill="#215dff" transform="scale(.80 .76) translate(193 166)" opacity=".9"/>
      ${lightning('730,120 654,360 724,340 680,528 828,276 758,302 812,120', '#fff', '#061138', 16)}
      ${lightning('932,180 870,386 936,374 892,548 1046,308 974,334 1034,174', '#ffd72e', '#061138', 12)}
      ${rope(138, 690, 1398, 568, '#10b7ff')}
      ${rope(108, 743, 1418, 660, '#ff2aa4')}
    </g>
    <g transform="rotate(-8 295 355)">${cat(273, 298, .64)}</g>
    <g transform="rotate(9 1228 330)">${human(1224, 312, .58)}</g>
    <g>
      ${burst('move1', 420, 302, 82, 127, 10, 0.04)}<use href="#move1" fill="#1ebeff" stroke="#061138" stroke-width="16" stroke-linejoin="round"/><use href="#move1" fill="#fff" transform="scale(.86) translate(70 50)" opacity=".9"/>
      ${fist(420, 300, .46, '#0aa7ff')}
      ${burst('move2', 768, 218, 86, 132, 10, 0.0)}<use href="#move2" fill="#8647ff" stroke="#061138" stroke-width="16" stroke-linejoin="round"/><use href="#move2" fill="#fff" transform="scale(.86) translate(108 31)" opacity=".9"/>
      ${scissors(760, 213, .47, '#8f53ff')}
      ${burst('move3', 1110, 304, 82, 128, 10, -0.02)}<use href="#move3" fill="#ff2fa7" stroke="#061138" stroke-width="16" stroke-linejoin="round"/><use href="#move3" fill="#fff" transform="scale(.86) translate(179 50)" opacity=".9"/>
      ${palm(1110, 298, .43, '#ff42ab')}
    </g>
    <g filter="url(#pop)">
      ${textChunk({ text: 'เป่า', x: 382, y: 544, size: 166, rotate: -9, fill: 'url(#goldFill)' })}
      ${textChunk({ text: 'ยิ้ง', x: 732, y: 526, size: 174, rotate: 2, fill: 'url(#blueFill)' })}
      ${textChunk({ text: 'ฉุบ!', x: 1086, y: 552, size: 166, rotate: 8, fill: 'url(#goldFill)' })}
      ${textChunk({ text: 'อารีน่า!', x: 768, y: 772, size: 224, rotate: -2, fill: 'url(#pinkFill)' })}
    </g>
    ${lightning('700,598 628,704 704,690 660,818 826,634 740,662 804,578', '#fff', '#061138', 13)}
    ${star(178, 474, 46, '#ffd42b')} ${star(1330, 438, 42, '#1dc3ff', .4)} ${star(1180, 778, 34, '#ffd42b', .2)} ${star(278, 782, 34, '#ff39ad', -.2)}
  </svg>`;
}

function artTwo() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${defs()}
    <g transform="translate(0 14)">
      ${rope(190, 318, 1350, 318, '#ff2aa4')}
      ${rope(138, 392, 1400, 392, '#12b9ff')}
      ${rope(104, 466, 1432, 466, '#ffda31')}
      <path d="M188 630 C294 390 512 248 768 226 C1034 248 1244 398 1350 630 C1150 782 980 848 768 870 C546 846 370 778 188 630Z"
        fill="#4d2ad4" stroke="#061138" stroke-width="30" stroke-linejoin="round"/>
      <path d="M254 620 C352 440 548 332 768 318 C994 336 1174 440 1284 620 C1108 720 948 778 768 794 C582 776 430 720 254 620Z"
        fill="#2c57ff" opacity=".45"/>
      <path d="M238 620 C420 715 566 758 768 772 C960 760 1118 700 1298 620" fill="none" stroke="#ff2fa7" stroke-width="22" stroke-linecap="round"/>
      <path d="M342 744 C548 864 990 864 1196 744" fill="none" stroke="#fff7d8" stroke-width="20" stroke-linecap="round"/>
    </g>
    <g transform="rotate(-10 250 376)">${cat(242, 334, .56, 'wink')}</g>
    <g transform="rotate(8 1288 382)">${human(1288, 342, .54)}</g>
    <g>
      ${lightning('348,174 422,354 360,338 420,526 246,282 324,310 270,154', '#ffd72e', '#061138', 15)}
      ${lightning('1194,146 1108,354 1172,334 1116,534 1304,270 1218,306 1268,136', '#fff', '#061138', 15)}
      ${burst('topburst', 768, 206, 88, 152, 14, .08)}<use href="#topburst" fill="#ff2ca7" stroke="#061138" stroke-width="16" stroke-linejoin="round"/>
      ${scissors(768, 194, .48, '#8b57ff')}
    </g>
    <g filter="url(#pop)">
      ${textChunk({ text: 'เป่า ยิ้ง ฉุบ!', x: 768, y: 548, size: 168, rotate: -3, fill: 'url(#goldFill)' })}
      ${textChunk({ text: 'อารีน่า!', x: 768, y: 746, size: 254, rotate: 3, fill: 'url(#blueFill)' })}
    </g>
    <g>
      ${burst('leftmove', 300, 618, 70, 112, 9, .2)}<use href="#leftmove" fill="#1dc3ff" stroke="#061138" stroke-width="14" stroke-linejoin="round"/>${fist(300, 616, .38, '#09a9ff')}
      ${burst('rightmove', 1246, 624, 70, 112, 9, -.2)}<use href="#rightmove" fill="#ff2fa7" stroke="#061138" stroke-width="14" stroke-linejoin="round"/>${palm(1246, 616, .35, '#ff42ab')}
      ${star(498, 214, 38, '#ffd42b', .3)} ${star(1052, 210, 38, '#ffd42b', -.2)} ${star(148, 712, 34, '#ff39ad', .2)} ${star(1380, 738, 36, '#1dc3ff', -.1)}
    </g>
  </svg>`;
}

function artThree() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    ${defs()}
    <g transform="rotate(-7 768 520)">
      <path d="M192 254 L1328 142 L1428 704 L310 846Z" fill="#1c1d80" stroke="#061138" stroke-width="28" stroke-linejoin="round"/>
      <path d="M260 296 L1282 200 L1360 652 L350 782Z" fill="#592dd3" stroke="#ff2fa7" stroke-width="18" stroke-linejoin="round"/>
      <path d="M306 338 L1234 250 L1294 622 L398 732Z" fill="#283fff" opacity=".45"/>
      ${rope(244, 376, 1318, 274, '#11baff')}
      ${rope(280, 458, 1350, 360, '#ff2aa4')}
    </g>
    ${lightning('612,104 720,342 632,326 738,574 492,274 592,304 530,94', '#fff', '#061138', 17)}
    ${lightning('934,126 864,360 932,346 850,592 1058,316 980,340 1030,116', '#ffd72e', '#061138', 14)}
    <g filter="url(#pop)">
      ${textChunk({ text: 'เป่า', x: 368, y: 492, size: 170, rotate: -13, fill: 'url(#blueFill)' })}
      ${textChunk({ text: 'ยิ้ง', x: 730, y: 454, size: 184, rotate: -3, fill: 'url(#goldFill)' })}
      ${textChunk({ text: 'ฉุบ!', x: 1094, y: 416, size: 168, rotate: 7, fill: 'url(#pinkFill)' })}
      ${textChunk({ text: 'อารีน่า!', x: 770, y: 726, size: 238, rotate: -6, fill: 'url(#goldFill)' })}
    </g>
    <g transform="rotate(8 320 720)">${cat(296, 690, .62)}</g>
    <g transform="rotate(-10 1250 690)">${human(1264, 652, .57)}</g>
    <g>
      ${burst('fistburst3', 194, 382, 70, 112, 9, .08)}<use href="#fistburst3" fill="#1ec1ff" stroke="#061138" stroke-width="14" stroke-linejoin="round"/>${fist(194, 382, .38, '#0aa7ff')}
      ${burst('sciburst3', 794, 198, 76, 122, 10, .04)}<use href="#sciburst3" fill="#8e49ff" stroke="#061138" stroke-width="14" stroke-linejoin="round"/>${scissors(788, 192, .40, '#8b57ff')}
      ${burst('palmburst3', 1340, 318, 70, 112, 9, -.12)}<use href="#palmburst3" fill="#ff2fa7" stroke="#061138" stroke-width="14" stroke-linejoin="round"/>${palm(1340, 310, .35, '#ff42ab')}
      ${star(160, 586, 40, '#ffd42b', .1)} ${star(1392, 562, 40, '#ffd42b', -.2)} ${star(470, 160, 34, '#ff39ad', .3)} ${star(1110, 856, 36, '#1dc3ff', .2)}
    </g>
  </svg>`;
}

const arts = [artOne(), artTwo(), artThree()];

function page(svg) {
  const encoded = svg.replace(/&/g, '&amp;');
  return `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        html, body { margin: 0; width: ${W}px; height: ${H}px; background: transparent; overflow: hidden; }
        body { display: grid; place-items: center; }
        svg { width: ${W}px; height: ${H}px; }
        .logo-word text { dominant-baseline: alphabetic; }
      </style>
    </head>
    <body>${encoded}</body>
  </html>`;
}

await fs.mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
try {
  for (let i = 0; i < arts.length; i += 1) {
    const pngPath = path.join(outDir, `logo-art-${i + 1}.png`);
    const pageHandle = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    await pageHandle.setContent(page(arts[i]), { waitUntil: 'load' });
    await pageHandle.screenshot({ path: pngPath, omitBackground: true });
    await pageHandle.close();
    console.log(pngPath);
  }
} finally {
  await browser.close();
}
