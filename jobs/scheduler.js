import { Op } from "sequelize";
import CrawlQueue from "../models/CrawlQueue.js";

/**
 * Mỗi tick (ví dụ mỗi phút) ta:
 *  - chọn các URL có nextCrawlAt <= now OR status = queued
 *  - tính Score(u) = alpha*Freshness + beta*Priority + gamma*Discovery
 *  - chọn top N để set status = processing (worker sẽ pop)
 */

const ALPHA = 0.6, BETA = 0.3, GAMMA = 0.1;

export async function pickDueUrls(limit = 20) {
  const now = new Date();
  // select candidates: queued or due
  const candidates = await CrawlQueue.findAll({
    where: {
      [Op.or]: [
        { status: "queued" },
        { nextCrawlAt: { [Op.lte]: now } }
      ]
    },
    limit: 200 // sample pool size to compute score
  });

  // compute score
  const scored = candidates.map(u => {
    const RI = u.recrawlInterval || (60 * 60);
    const freshness =
      (Date.now() - (u.lastCrawled ? u.lastCrawled.getTime() : 0)) /
      1000 /
      RI; // normalized
    const priority = u.score || 0; // you can store priority field separately
    const discovery = u.depth ? 1 / (u.depth + 1) : 1;
    const score = ALPHA * freshness + BETA * priority + GAMMA * discovery;
    return { u, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const selected = scored.slice(0, limit).map(s => s.u);

  // mark as processing to avoid double-pick
  for (const row of selected) {
    row.status = "processing";
    await row.save();
  }

  if (selected.length) {
    console.log("🕒 [Scheduler] Picked URLs this tick:");
    selected.forEach(r => {
      console.log(
        `   -> ${r.url} | depth=${r.depth} | nextCrawlAt=${r.nextCrawlAt}`
      );
    });
  } else {
    console.log("🕒 [Scheduler] No URLs due this tick.");
  }

  return selected;
}
