const puppeteer = require("puppeteer");
const cheerio = require("cheerio");
const https = require("https");
const fs = require("fs");

const username = process.env.TWITTER_USER;
const webhook = process.env.DISCORD_WEBHOOK;
const LAST_ID_FILE = "last_id.txt";

function postToDiscord(message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ content: message });

    const url = new URL(webhook);
    const options = {
      hostname: url.hostname,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": data.length,
      },
    };

    const req = https.request(options, (res) => {
      res.on("data", () => {});
      res.on("end", resolve);
    });

    req.on("error", reject);
    req.write(data);
    req.end();
  });
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

    tweetId = $(el).attr("data-testid") || "";

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
  } else {
    console.log("No new tweet.");
  }
}

main();
