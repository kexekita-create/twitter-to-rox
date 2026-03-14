import fetch from "node-fetch";
import * as cheerio from "cheerio";

const username = process.env.TWITTER_USER;
const webhook = process.env.DISCORD_WEBHOOK;

async function main() {
  const url = `https://nitter.net/${username}`;
  const res = await fetch(url);
  const html = await res.text();
  const $ = cheerio.load(html);

  const tweet = $(".timeline-item .tweet-content").first().text().trim();
  const link = "https://x.com/" + username;

  if (!tweet) return;

  await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      content: `**${username} の最新投稿**\n${tweet}\n${link}`
    })
  });
}

main();
