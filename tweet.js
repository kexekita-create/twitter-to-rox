const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const fs = require("fs");
const { execSync } = require("child_process");

const username = process.env.TWITTER_USER;
const webhook = process.env.DISCORD_WEBHOOK;
const LAST_ID_FILE = "last_id.txt";

// Discord のレスポンスを必ず表示する版
async function postToDiscord(message) {
  const res = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: message }),
  });

  const text = await res.text();
  console.log("Discord status:", res.status);
  console.log("Discord response:", text);

  if (!res.ok) {
    throw new Error("Discord error: " + res.status);
  }
}

// GitHub に last_id.txt を保存する
function saveToGitHub() {
  try {
    execSync("git config user.name 'github-actions[bot]'");
    execSync("git config user.email 'github-actions[bot]@users.noreply.github.com'");
    execSync("git add last_id.txt");
    execSync("git commit -m 'update last tweet id' || echo 'no changes'");
    execSync("git push");
    console.log("Pushed last_id.txt to GitHub.");
  } catch (e) {
    console.error("Git push failed:", e.message);
  }
}

async function main() {
  const url = `https://x.com/${username}`;

  const browser = await puppeteer.launch({
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const page = await browser.newPage();

  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36"
  );

  await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

  await page.waitForSelector("article", { timeout: 60000 });

  const html = await page.content();
  await browser.close();

  const $ = cheerio.load(html);

  let tweet = "";
  let tweetId = "";

  const articles = $("article");

  articles.each((i, el) => {
    if (tweet) return;

    // ★ tweetId を正しく取得（ここだけ修正）
    const link = $(el).find("a[href*='/status/']").attr("href");
    if (link) {
      const match = link.match(/status\/(\d+)/);
      if (match) {
        tweetId = match[1];
      }
    }

    const text =
      $(el).find("div[data-testid='tweetText']").text().trim() ||
      $(el).find("div[lang]").text().trim() ||
      $(el).find("span").text().trim();

    if (text) {
      tweet = text;
    }
  });

  console.log("DEBUG tweetId:", tweetId);
  console.log("DEBUG tweet:", tweet);

  if (!tweet || !tweetId) {
    console.log("No tweet found.");
    return;
  }

  let lastId = "";
  if (fs.existsSync(LAST_ID_FILE)) {
    lastId = fs.readFileSync(LAST_ID_FILE, "utf8").trim();
  }

  if (tweetId !== lastId) {
    const message = `**${username} の最新投稿**\n${tweet}\nhttps://x.com/${username}`;
    await postToDiscord(message);
    console.log("Posted to Discord.");

    fs.writeFileSync(LAST_ID_FILE, tweetId);
    console.log("Saved last_id.txt:", tweetId);

    // ★ GitHub に保存
    saveToGitHub();
  } else {
    console.log("No new tweet.");
  }
}

main();
