const fs = require("fs");

const LEETCODE_USER = "imrajeevnayan";
const GFG_USER = "imrajeevnayan";

const urls = {
  leetcode: `https://alfa-leetcode-api.onrender.com/${LEETCODE_USER}/solved`,
  gfgProfile: `https://www.geeksforgeeks.org/profile/${GFG_USER}?tab=activity`,
  gfgCard: `https://gfgstatscard.vercel.app/${GFG_USER}`,
};

const colors = {
  bg: "#0d1117",
  panel: "#161b22",
  panel2: "#f8fcf9",
  border: "#30363d",
  text: "#f0f6fc",
  muted: "#8b949e",
  blue: "#58a6ff",
  green: "#2f8d46",
  softGreen: "#cceea2",
  easy: "#a7d477",
  medium: "#ffb340",
  hard: "#ff7043",
  school: "#8ee8e0",
  leetcode: "#ffa116",
};

async function getText(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 GitHub README stats generator",
      accept: "text/html,application/json,image/svg+xml,*/*",
    },
  });

  if (!res.ok) {
    throw new Error(`${url} returned ${res.status}`);
  }

  return res.text();
}

async function getJson(url) {
  return JSON.parse(await getText(url));
}

function pick(regex, text, fallback = 0) {
  const match = text.match(regex);
  return match ? Number(match[1].replace(/,/g, "")) : fallback;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString("en-US");
}

function gfgArticleCount(profileHtml) {
  const block = (profileHtml.match(/articleCount\\?":\\?\{.*?userData/s)?.[0] || "").replace(/\\"/g, '"');
  return {
    score: pick(/"score":(\d+)/, block),
    solved: pick(/"total_problems_solved":(\d+)/, block),
    rank: pick(/"institute_rank":"?(\d+)"?/, block),
    articles: pick(/"total_articles_published":(\d+)/, block),
    streak: pick(/"pod_solved_current_streak":(\d+)/, block),
    monthlyScore: pick(/"monthly_score":(\d+)/, block),
  };
}

function parseGfgDifficulty(cardSvg) {
  const school = pick(/id="school-solved-count">(\d+)/, cardSvg);
  const basic = pick(/id="basic-solved-count">(\d+)/, cardSvg);
  const easy = pick(/id="easy-solved-count">(\d+)/, cardSvg);
  const medium = pick(/id="medium-solved-count">(\d+)/, cardSvg);
  const hard = pick(/id="hard-solved-count">(\d+)/, cardSvg);

  return {
    school,
    basic,
    easy,
    medium,
    hard,
    total: school + basic + easy + medium + hard,
  };
}

function donutSegments(items, cx, cy, r, width) {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  const circumference = 2 * Math.PI * r;
  let offset = 25;

  return items
    .filter((item) => item.value > 0)
    .map((item) => {
      const len = (item.value / total) * circumference;
      const dash = `${len.toFixed(2)} ${(circumference - len).toFixed(2)}`;
      const segment = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${item.color}" stroke-width="${width}" stroke-dasharray="${dash}" stroke-dashoffset="${offset.toFixed(2)}" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="butt" />`;
      offset -= len;
      return segment;
    })
    .join("\n");
}

function progressBar({ x, y, width, value, total, color }) {
  const filled = Math.max(4, Math.round((Number(value || 0) / Math.max(1, total)) * width));
  return `
    <rect x="${x}" y="${y}" width="${width}" height="8" rx="4" fill="#253041" />
    <rect x="${x}" y="${y}" width="${filled}" height="8" rx="4" fill="${color}" />`;
}

function pill({ x, y, label, value, accent, icon }) {
  return `
    <g transform="translate(${x}, ${y})">
      <rect width="250" height="48" rx="12" fill="#f7fbf8" stroke="#d7f0df" />
      <rect x="12" y="10" width="28" height="28" rx="9" fill="${accent}22" />
      <text x="26" y="30" text-anchor="middle" class="mini-icon" fill="${accent}">${escapeXml(icon)}</text>
      <text x="52" y="30" class="dark-label">${escapeXml(label)}</text>
      <rect x="200" y="10" width="36" height="28" rx="14" fill="#ffffff" stroke="#bfe8ce" />
      <text x="218" y="29" text-anchor="middle" class="dark-value">${escapeXml(value)}</text>
    </g>`;
}

function generateSvg({ leetcode, gfg, generatedAt }) {
  const lcTotal = leetcode.solvedProblem || 0;
  const totalSolved = lcTotal + gfg.solved;
  const gfgTotal = gfg.difficulty.total || gfg.solved;
  const donut = [
    { label: "School", value: gfg.difficulty.school, color: colors.school },
    { label: "Basic", value: gfg.difficulty.basic, color: colors.softGreen },
    { label: "Easy", value: gfg.difficulty.easy, color: colors.easy },
    { label: "Medium", value: gfg.difficulty.medium, color: colors.medium },
    { label: "Hard", value: gfg.difficulty.hard, color: colors.hard },
  ];

  return `<svg xmlns="http://www.w3.org/2000/svg" width="920" height="430" viewBox="0 0 920 430" role="img" aria-labelledby="title desc">
  <title id="title">Dynamic Coding Practice Stats</title>
  <desc id="desc">Auto-generated LeetCode and GeeksforGeeks statistics for ${LEETCODE_USER}</desc>
  <style>
    .bg { fill: ${colors.bg}; }
    .card { fill: ${colors.panel}; stroke: ${colors.border}; stroke-width: 1; }
    .light-card { fill: #ffffff; stroke: #d8dee4; stroke-width: 1; }
    .title { font: 700 18px 'Segoe UI', Ubuntu, sans-serif; fill: ${colors.blue}; }
    .label { font: 700 12px 'Segoe UI', Ubuntu, sans-serif; fill: ${colors.text}; }
    .value { font: 800 28px 'Segoe UI', Ubuntu, sans-serif; fill: ${colors.text}; }
    .muted { font: 500 12px 'Segoe UI', Ubuntu, sans-serif; fill: ${colors.muted}; }
    .tiny { font: 600 10px 'Segoe UI', Ubuntu, sans-serif; fill: ${colors.muted}; }
    .dark-title { font: 700 15px 'Segoe UI', Ubuntu, sans-serif; fill: #0b1220; }
    .dark-label { font: 600 12px 'Segoe UI', Ubuntu, sans-serif; fill: #111827; }
    .dark-value { font: 800 13px 'Segoe UI', Ubuntu, sans-serif; fill: #111827; }
    .donut-number { font: 900 32px 'Segoe UI', Ubuntu, sans-serif; fill: #050816; }
    .donut-caption { font: 600 11px 'Segoe UI', Ubuntu, sans-serif; fill: #111827; }
    .mini-icon { font: 900 15px 'Segoe UI', Ubuntu, sans-serif; }
  </style>

  <rect class="bg" width="920" height="430" rx="14" />
  <text class="title" x="28" y="34">Competitive Programming &amp; DSA Overview</text>
  <text class="muted" x="28" y="54">Auto-updated from LeetCode, GeeksforGeeks &amp; Codolio - ${escapeXml(generatedAt)}</text>

  <g transform="translate(24, 76)">
    <rect class="card" width="188" height="270" rx="8" />
    <text class="label" x="20" y="34">TOTAL SOLVED</text>
    <text class="value" x="20" y="78" fill="#3fb950">${formatNumber(totalSolved)}</text>
    <text class="muted" x="20" y="98">Live platform total</text>
    <line x1="20" x2="168" y1="126" y2="126" stroke="${colors.border}" />
    <text class="label" x="20" y="154">ACTIVE SOURCES</text>
    <text class="value" x="20" y="194" fill="${colors.blue}">2</text>
    <text class="muted" x="20" y="214">LeetCode + GFG</text>
    <text class="tiny" x="20" y="246">Regenerated by GitHub Actions</text>
  </g>

  <g transform="translate(228, 76)">
    <rect class="card" width="228" height="270" rx="8" />
    <circle cx="28" cy="28" r="8" fill="${colors.leetcode}" />
    <text class="title" x="44" y="34" fill="${colors.leetcode}">LeetCode</text>
    <text class="value" x="20" y="78">${formatNumber(lcTotal)} <tspan class="muted">Solved</tspan></text>
    <text class="muted" x="20" y="98">Accepted submissions: ${formatNumber(leetcode.acSubmissionNum?.[0]?.submissions || 0)}</text>

    <text class="label" x="20" y="132">Easy</text>
    <text class="muted" x="182" y="132">${formatNumber(leetcode.easySolved || 0)}</text>
    ${progressBar({ x: 20, y: 142, width: 188, value: leetcode.easySolved, total: lcTotal, color: "#00b8a3" })}

    <text class="label" x="20" y="176">Medium</text>
    <text class="muted" x="182" y="176">${formatNumber(leetcode.mediumSolved || 0)}</text>
    ${progressBar({ x: 20, y: 186, width: 188, value: leetcode.mediumSolved, total: lcTotal, color: "#ffc01e" })}

    <text class="label" x="20" y="220">Hard</text>
    <text class="muted" x="182" y="220">${formatNumber(leetcode.hardSolved || 0)}</text>
    ${progressBar({ x: 20, y: 230, width: 188, value: leetcode.hardSolved, total: lcTotal, color: "#ff375f" })}
  </g>

  <g transform="translate(472, 76)">
    <rect class="light-card" width="416" height="270" rx="12" />
    <text class="dark-title" x="28" y="34">Problems Overview</text>
    <circle cx="112" cy="146" r="62" fill="none" stroke="#eef2f7" stroke-width="24" />
    ${donutSegments(donut, 112, 146, 62, 24)}
    <text class="donut-number" x="112" y="138" text-anchor="middle">${formatNumber(gfgTotal)}</text>
    <text class="donut-caption" x="112" y="158" text-anchor="middle">Problems</text>
    <text class="donut-caption" x="112" y="172" text-anchor="middle">Solved</text>

    ${donut
      .map((item, index) => {
        const y = 86 + index * 28;
        return `<rect x="210" y="${y - 9}" width="10" height="10" rx="2" fill="${item.color}" />
    <text class="dark-label" x="228" y="${y}">${item.label} (${formatNumber(item.value)})</text>`;
      })
      .join("\n")}
  </g>

  <g transform="translate(472, 362)">
    <rect width="416" height="44" rx="10" fill="#121821" stroke="${colors.border}" />
    <text class="muted" x="18" y="27">GFG dynamic details</text>
    <text class="label" x="158" y="27">Score ${formatNumber(gfg.score)}</text>
    <text class="label" x="248" y="27">Monthly ${formatNumber(gfg.monthlyScore)}</text>
    <text class="label" x="344" y="27">Streak ${formatNumber(gfg.streak)}</text>
  </g>

  ${pill({ x: 24, y: 362, label: "Coding Score", value: formatNumber(gfg.score), accent: colors.green, icon: "CS" })}
  ${pill({ x: 292, y: 362, label: "Problems Solved", value: formatNumber(gfg.solved), accent: "#3b82f6", icon: "OK" })}
</svg>
`;
}

async function main() {
  const [leetcode, gfgProfileHtml, gfgCardSvg] = await Promise.all([
    getJson(urls.leetcode),
    getText(urls.gfgProfile),
    getText(urls.gfgCard),
  ]);

  const gfg = {
    ...gfgArticleCount(gfgProfileHtml),
    difficulty: parseGfgDifficulty(gfgCardSvg),
  };

  if (!leetcode.solvedProblem || !gfg.solved || !gfg.difficulty.total) {
    throw new Error("Live stats response was incomplete; refusing to overwrite dsa-stats.svg");
  }

  const generatedAt = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
  fs.writeFileSync("dsa-stats.svg", generateSvg({ leetcode, gfg, generatedAt }));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
