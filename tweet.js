const https = require("https");
const cheerio = require("cheerio");

const username = process.env.TWITTER_USER;
const webhook = process.env.DISCORD_WEBHOOK;

function fetchHTML(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
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
  const nitter = `https://nitter.net/${username}`;
  const html = await fetchHTML(nitter);
  const $ = cheerio.load(html);

  const tweet = $(".timeline-item .tweet-content").first().text().trim();
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
