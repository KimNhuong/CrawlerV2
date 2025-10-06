import { pickDueUrls } from "./jobs/scheduler.js";
import { crawlUrlTask } from "./services/crawlerWorker.js";
import CrawlQueue from "./models/CrawlQueue.js";
import db from "./config/Database.js";

const CONCURRENCY = 4;

async function mainLoop() {
  while (true) {
    try {
      const urls = await pickDueUrls(CONCURRENCY * 2);
      if (!urls.length) {
        await new Promise(r => setTimeout(r, 30 * 1000)); // sleep 30s if no work
        continue;
      }
      const running = [];
      for (let i = 0; i < Math.min(urls.length, CONCURRENCY); i++) {
        const row = urls[i];
        running.push(crawlUrlTask(row));
      }
      await Promise.allSettled(running);
    } catch (err) {
      console.error("Main loop error", err);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
}

await db.sync({ alter: true });

const seedUrl = "https://baomoi.com/tin-moi.epi"; // URL gốc để crawl

const exists = await CrawlQueue.findOne({ where: { url: seedUrl } });
if (!exists) {
  await CrawlQueue.create({
    url: seedUrl,
    domain: new URL(seedUrl).hostname,
    depth: 0,
    status: "queued",
    nextCrawlAt: new Date(),
  });
  console.log("🌱 Seed URL inserted:", seedUrl);
}

mainLoop();
