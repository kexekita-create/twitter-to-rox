const https = require("https");
const cheerio = require("cheerio");

const username = process.env.TWITTER_USER;
const webhook = process.env.DISCORD_WEBHOOK;

function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"
      }
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

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
  const nitter = `https://nitter.cz/${username}`;
  const html = await fetchHTML(nitter);

  console.log("HTML length:", html.length);
  console.log(html.slice(0, 500));


  const $ = cheerio.load(html);

  // ★ 2026年 Nitter の構造に合わせた3段階フォールバック
  let tweet =
    $("div.timeline-item div.tweet-text p").first().text().trim() ||   // 最も新しい構造
    $("div.timeline-item .tweet-text").first().text().trim() ||        // 旧構造
    $("div.timeline-item .tweet-content").first().text().trim();       // さらに旧構造

  const link = `https://x.com/${username}`;

  if (!tweet) {
    console.log("No tweet found.");
    return;
  }

  const message = `**${username} の最新投稿**\n${tweet}\n${link}`;
  await postToDiscord(message);

  console.log("Posted to Discord.");
}

main();
