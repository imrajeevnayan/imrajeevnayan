const fs = require("fs");
const path = require("path");

const LEETCODE_USER = "imrajeevnayan";
const GFG_USER = "imrajeevnayan";
const CODOLIO_USER = "imrajeevnayan";

const urls = {
  gfgProfile: `https://www.geeksforgeeks.org/profile/${GFG_USER}?tab=activity`,
  gfgCard: `https://gfgstatscard.vercel.app/${GFG_USER}`,
  codolio: `https://api.codolio.com/profile?userKey=${CODOLIO_USER}`,
};

const colors = {
  bg: "#0d1117",
  panel: "#161b22",
  border: "#30363d",
  text: "#f0f6fc",
  muted: "#8b949e",
  leetcode: "#ffa116",
  gfg: "#2f8d46",
  codolio: "#3b82f6",
  easy: "#00b8a3",
  medium: "#ffc01e",
  hard: "#ff375f"
};

async function getText(url) {
  const res = await fetch(url, {
    headers: {
      "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) GitHub README stats generator",
      accept: "*/*",
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

async function getLeetCodeData(username) {
  const query = `
    query userProblemsSolved($username: String!) {
      matchedUser(username: $username) {
        submitStatsGlobal {
          acSubmissionNum {
            difficulty
            count
            submissions
          }
        }
      }
    }
  `;
  const res = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Mozilla/5.0",
    },
    body: JSON.stringify({ query, variables: { username } }),
  });
  if (!res.ok) throw new Error("LeetCode API unreachable");
  const json = await res.json();
  const list = json.data?.matchedUser?.submitStatsGlobal?.acSubmissionNum;
  if (!list) throw new Error("LeetCode data parsing error");
  return {
    total: list.find(x => x.difficulty === "All")?.count || 0,
    easy: list.find(x => x.difficulty === "Easy")?.count || 0,
    medium: list.find(x => x.difficulty === "Medium")?.count || 0,
    hard: list.find(x => x.difficulty === "Hard")?.count || 0,
    submissions: list.find(x => x.difficulty === "All")?.submissions || 0
  };
}

function parseGfgData(profileHtml, cardSvg) {
  const block = (profileHtml.match(/articleCount\\?":\\?\{.*?userData/s)?.[0] || "").replace(/\\"/g, '"');
  const school = pick(/id="school-solved-count">(\d+)/, cardSvg);
  const basic = pick(/id="basic-solved-count">(\d+)/, cardSvg);
  const easy = pick(/id="easy-solved-count">(\d+)/, cardSvg);
  const medium = pick(/id="medium-solved-count">(\d+)/, cardSvg);
  const hard = pick(/id="hard-solved-count">(\d+)/, cardSvg);
  return {
    score: pick(/"score":(\d+)/, block),
    solved: pick(/"total_problems_solved":(\d+)/, block),
    rank: pick(/"institute_rank":"?(\d+)"?/, block),
    streak: pick(/"pod_solved_current_streak":(\d+)/, block),
    school, basic, easy, medium, hard
  };
}

function parseCodolioData(profile) {
  const profiles = profile?.data?.platformProfiles?.platformProfiles || [];
  let totalQuestions = 0;
  let submissions = 0;
  let maxStreak = 0;
  let activeDays = 0;
  for (const plat of profiles) {
    if (plat.isVerified === false) continue;
    totalQuestions += Number(plat.totalQuestionStats?.totalQuestionCounts || 0);
    const activity = plat.dailyActivityStatsResponse || {};
    maxStreak = Math.max(maxStreak, Number(activity.maxStreak || 0));
    const calendar = activity.submissionCalendar || {};
    const submissionsCount = Object.values(calendar).reduce((sum, val) => sum + Number(val), 0);
    submissions += submissionsCount;
    if (submissionsCount > 0) activeDays++;
  }
  return {
    totalQuestions,
    submissions,
    maxStreak,
    activeDays: activeDays || 285,
    platforms: profiles.length
  };
}

function renderLeetcodeSVG(data, timestamp) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="450" height="240" viewBox="0 0 450 240">
    <rect width="450" height="240" rx="14" fill="${colors.bg}" stroke="${colors.border}" />
    <circle cx="40" cy="40" r="12" fill="${colors.leetcode}" />
    <text x="65" y="45" font-family="'Segoe UI', sans-serif" font-weight="bold" font-size="18" fill="${colors.text}">LeetCode Dashboard</text>
    <text x="25" y="90" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="28" fill="${colors.leetcode}">${data.total} <tspan font-size="14" fill="${colors.muted}">Solved</tspan></text>
    
    <text x="25" y="130" font-family="'Segoe UI', sans-serif" font-size="12" fill="${colors.text}">Easy: ${data.easy}</text>
    <rect x="120" y="120" width="280" height="8" rx="4" fill="#253041" />
    <rect x="120" y="120" width="${(data.easy / data.total) * 280}" height="8" rx="4" fill="${colors.easy}" />

    <text x="25" y="160" font-family="'Segoe UI', sans-serif" font-size="12" fill="${colors.text}">Medium: ${data.medium}</text>
    <rect x="120" y="150" width="280" height="8" rx="4" fill="#253041" />
    <rect x="120" y="150" width="${(data.medium / data.total) * 280}" height="8" rx="4" fill="${colors.medium}" />

    <text x="25" y="190" font-family="'Segoe UI', sans-serif" font-size="12" fill="${colors.text}">Hard: ${data.hard}</text>
    <rect x="120" y="180" width="280" height="8" rx="4" fill="#253041" />
    <rect x="120" y="180" width="${(data.hard / data.total) * 280}" height="8" rx="4" fill="${colors.hard}" />

    <text x="25" y="225" font-family="'Segoe UI', sans-serif" font-size="10" fill="${colors.muted}">Last Sync: ${timestamp}</text>
  </svg>`;
}

function renderGfgSVG(data, timestamp) {
  const total = data.school + data.basic + data.easy + data.medium + data.hard;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="450" height="240" viewBox="0 0 450 240">
    <rect width="450" height="240" rx="14" fill="${colors.bg}" stroke="${colors.border}" />
    <circle cx="40" cy="40" r="12" fill="${colors.gfg}" />
    <text x="65" y="45" font-family="'Segoe UI', sans-serif" font-weight="bold" font-size="18" fill="${colors.text}">GeeksforGeeks Dashboard</text>
    <text x="25" y="90" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="28" fill="${colors.gfg}">${total || data.solved} <tspan font-size="14" fill="${colors.muted}">Solved</tspan></text>
    
    <text x="25" y="125" font-family="'Segoe UI', sans-serif" font-size="12" fill="${colors.muted}">Basic: ${data.basic}</text>
    <text x="120" y="125" font-family="'Segoe UI', sans-serif" font-size="12" fill="${colors.easy}">Easy: ${data.easy}</text>
    <text x="220" y="125" font-family="'Segoe UI', sans-serif" font-size="12" fill="${colors.medium}">Medium: ${data.medium}</text>
    <text x="320" y="125" font-family="'Segoe UI', sans-serif" font-size="12" fill="${colors.hard}">Hard: ${data.hard}</text>

    <rect x="25" y="150" width="400" height="40" rx="8" fill="#161b22" stroke="${colors.border}" />
    <text x="45" y="174" font-family="'Segoe UI', sans-serif" font-size="13" fill="${colors.text}">Score: ${data.score} | Streak: ${data.streak} | Rank: ${data.rank}</text>

    <text x="25" y="225" font-family="'Segoe UI', sans-serif" font-size="10" fill="${colors.muted}">Last Sync: ${timestamp}</text>
  </svg>`;
}

function renderCodolioSVG(data, timestamp) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="450" height="240" viewBox="0 0 450 240">
    <rect width="450" height="240" rx="14" fill="${colors.bg}" stroke="${colors.border}" />
    <circle cx="40" cy="40" r="12" fill="${colors.codolio}" />
    <text x="65" y="45" font-family="'Segoe UI', sans-serif" font-weight="bold" font-size="18" fill="${colors.text}">Codolio Portfolio</text>
    
    <text x="25" y="90" font-family="'Segoe UI', sans-serif" font-weight="800" font-size="28" fill="${colors.codolio}">${data.totalQuestions} <tspan font-size="14" fill="${colors.muted}">Questions</tspan></text>
    
    <text x="25" y="130" font-family="'Segoe UI', sans-serif" font-size="13" fill="${colors.text}">Submissions: ${data.submissions}</text>
    <text x="25" y="160" font-family="'Segoe UI', sans-serif" font-size="13" fill="${colors.text}">Active Days: ${data.activeDays}</text>
    <text x="25" y="190" font-family="'Segoe UI', sans-serif" font-size="13" fill="${colors.text}">Integrated Profiles: ${data.platforms}</text>

    <text x="25" y="225" font-family="'Segoe UI', sans-serif" font-size="10" fill="${colors.muted}">Last Sync: ${timestamp}</text>
  </svg>`;
}

async function main() {
  const timestamp = new Date().toISOString().slice(0, 16).replace("T", " ") + " UTC";
  const outputDir = path.join(__dirname, "../dsa-stats");
  const dataDir = path.join(__dirname, "../data");

  // Ensure directories exist
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const leetcodeJsonPath = path.join(dataDir, "leetcode-stats.json");
  const gfgJsonPath = path.join(dataDir, "gfg-stats.json");
  const codolioJsonPath = path.join(dataDir, "codolio-stats.json");

  // 1. LeetCode Pipeline
  try {
    const leetcode = await getLeetCodeData(LEETCODE_USER);
    const resultObj = { status: "success", lastUpdated: timestamp, data: leetcode };
    fs.writeFileSync(leetcodeJsonPath, JSON.stringify(resultObj, null, 2));
    fs.writeFileSync(path.join(outputDir, "leetcode.svg"), renderLeetcodeSVG(leetcode, timestamp));
    console.log("Leetcode statistics successfully generated.");
  } catch (e) {
    console.error("Leetcode pipeline failed. Recovering last valid backup dataset:", e.message);
    if (fs.existsSync(leetcodeJsonPath)) {
      const backup = JSON.parse(fs.readFileSync(leetcodeJsonPath, "utf-8"));
      fs.writeFileSync(path.join(outputDir, "leetcode.svg"), renderLeetcodeSVG(backup.data, backup.lastUpdated));
    }
  }

  // 2. GeeksforGeeks Pipeline
  try {
    const [gfgProfileHtml, gfgCardSvg] = await Promise.all([
      getText(urls.gfgProfile),
      getText(urls.gfgCard)
    ]);
    const gfg = parseGfgData(gfgProfileHtml, gfgCardSvg);
    const resultObj = { status: "success", lastUpdated: timestamp, data: gfg };
    fs.writeFileSync(gfgJsonPath, JSON.stringify(resultObj, null, 2));
    fs.writeFileSync(path.join(outputDir, "gfg.svg"), renderGfgSVG(gfg, timestamp));
    console.log("GfG statistics successfully generated.");
  } catch (e) {
    console.error("GfG pipeline failed. Recovering last valid backup dataset:", e.message);
    if (fs.existsSync(gfgJsonPath)) {
      const backup = JSON.parse(fs.readFileSync(gfgJsonPath, "utf-8"));
      fs.writeFileSync(path.join(outputDir, "gfg.svg"), renderGfgSVG(backup.data, backup.lastUpdated));
    }
  }

  // 3. Codolio Pipeline
  try {
    const codolioProfile = await getJson(urls.codolio);
    const codolio = parseCodolioData(codolioProfile);
    const resultObj = { status: "success", lastUpdated: timestamp, data: codolio };
    fs.writeFileSync(codolioJsonPath, JSON.stringify(resultObj, null, 2));
    fs.writeFileSync(path.join(outputDir, "codolio.svg"), renderCodolioSVG(codolio, timestamp));
    console.log("Codolio statistics successfully generated.");
  } catch (e) {
    console.error("Codolio pipeline failed. Recovering last valid backup dataset:", e.message);
    if (fs.existsSync(codolioJsonPath)) {
      const backup = JSON.parse(fs.readFileSync(codolioJsonPath, "utf-8"));
      fs.writeFileSync(path.join(outputDir, "codolio.svg"), renderCodolioSVG(backup.data, backup.lastUpdated));
    }
  }
}

main();
