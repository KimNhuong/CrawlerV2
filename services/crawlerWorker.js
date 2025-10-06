import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";  // 👈 đổi sang puppeteer-core
import * as cheerio from "cheerio";
import ProxyPool from "../lib/proxyPool.js";
import { TokenBucket } from "../lib/rateLimiter.js";
import { sha256 } from "../lib/hash.js";
import CrawlQueue from "../models/CrawlQueue.js";
import Page from "../models/Page.js";
import db from "../config/Database.js";
//kiểm tra chromePath cho từng thiết bị
const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

puppeteer.use(StealthPlugin());
const proxyPool = new ProxyPool([
  // { host: "proxy1.example:port", username: "...", password: "..." }
]);

// 📌 Extract author name từ nhiều dạng thẻ
const extractAuthor = ($) => {
  // 1. Các thẻ có class chứa 'author'
  let author =
    $("p[class*='author'], span[class*='author'], div[class*='author']")
      .text()
      .trim();

  // 2. Các thẻ meta
  if (!author) {
    author =
      $('meta[name="author"]').attr("content") ||
      $('meta[property="article:author"]').attr("content") ||
      $('[rel=author]').text().trim() ||
      "";
  }

  // 3. Các thẻ strong/em nằm trong block có chữ "author"
  if (!author) {
    $("p, div, span").each((_, el) => {
      const text = $(el).text().toLowerCase();
      if (text.includes("tác giả") || text.includes("author")) {
        // lấy strong hoặc em bên trong
        const candidate =
          $(el).find("strong").text().trim() ||
          $(el).find("em").text().trim() ||
          $(el).text().trim();
        if (candidate) {
          author = candidate;
          return false; // break loop
        }
      }
    });
  }

  return author || null;
};


const rateLimiter = new TokenBucket({ capacity: 10, refillRate: 5 });

// Exponential backoff helper
function backoffRetry(fn, { retries = 5, baseMs = 1000 } = {}) {
  return async function (...args) {
    let attempt = 0;
    while (true) {
      try {
        return await fn(...args);
      } catch (err) {
        attempt++;
        const status = err && err.statusCode ? err.statusCode : null;
        if (status && status >= 400 && status < 500 && status !== 429) throw err;
        if (attempt > retries) throw err;
        const wait = baseMs * 2 ** (attempt - 1) + Math.floor(Math.random() * 300);
        console.warn(`Retry ${attempt}/${retries} after ${wait}ms due to`, err.message || err);
        await new Promise(r => setTimeout(r, wait));
      }
    }
  };
}

async function launchBrowser(proxy) {
  const args = ["--no-sandbox", "--disable-setuid-sandbox"];
  if (proxy && proxy.host) {
    args.push(`--proxy-server=${proxy.host}`);
  }
    const browser = await puppeteer.launch({
    headless: "new",   // thử "false" nếu vẫn treo để debug
    executablePath: chromePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
    });
  return browser;
}

export async function crawlUrlTask(queueRow) {
  console.log(`🚀 [START] Crawling: ${queueRow.url}`);

  await rateLimiter.waitForToken();
  const proxy = proxyPool.next();
  let browser;

  try {
    browser = await launchBrowser(proxy);
    console.log(`🌐 Browser launched for: ${queueRow.url}`);

    const page = await browser.newPage();

    if (proxy && proxy.username) {
      await page.authenticate({ username: proxy.username, password: proxy.password });
      console.log(`🔑 Proxy authenticated for: ${queueRow.url}`);
    }

    await page.setUserAgent("Mozilla/5.0 (compatible; MyCrawler/1.0)");
    await page.setDefaultNavigationTimeout(30000);

    const gotoWithRetry = backoffRetry(async (url) => {
      console.log(`📡 Navigating to ${url}...`);
      const resp = await page.goto(url, { waitUntil: "domcontentloaded" });
      console.log(`📥 Response ${resp.status()} for ${url}`);
      if (resp.status() === 429) {
        const err = new Error("Rate limited (429)");
        err.statusCode = 429;
        throw err;
      }
      return resp;
    }, { retries: 6, baseMs: 1000 });

    await gotoWithRetry(queueRow.url);
    const html = await page.content();

    const $ = cheerio.load(html);
    // const article = $("article").text() || $("body").text();
    // const contentHash = sha256(article);
    // Thu gọn content: chỉ lấy thẻ <p>
    let content = "";
    $("article p, .article p, .content p, .main p").each((_, el) => {
    content += $(el).text().trim() + "\n";
    });

    // Lấy subtitle từ h2, h3
    let subtitle = "";
    $("article h2, article h3, .article h2, .article h3").each((_, el) => {
    subtitle += $(el).text().trim() + " | ";
    });
    subtitle = subtitle.replace(/\s*\|\s*$/, ""); // bỏ dấu | thừa

    // Nếu rỗng fallback
    if (!content.trim()) content = $("body p").text();

    // Hash dựa trên content sạch
    const contentHash = sha256(content);



    const changed = queueRow.contentHash !== contentHash;
    console.log(`🔎 Compare hash: changed = ${changed} for ${queueRow.url}`);

    if (changed) {
      await Page.upsert({
        url: queueRow.url,
        title: $("title").text() || null,
        subtitle: subtitle || null,
        content: content,
        author: extractAuthor($),
        timestamp: new Date(),
      });
      console.log(`📝 Page updated in DB: ${queueRow.url}`);

      queueRow.changeRate = Math.min(1, (queueRow.changeRate || 0) + 1);
      queueRow.contentHash = contentHash;
      queueRow.failCount = 0;
      queueRow.status = "done";
      queueRow.lastCrawled = new Date();
      queueRow.visits = (queueRow.visits || 0) + 1;
      queueRow.changes = (queueRow.changes || 0) + 1;
    } else {
      console.log(`ℹ️ No changes detected: ${queueRow.url}`);
      queueRow.visits = (queueRow.visits || 0) + 1;
      queueRow.failCount = 0;
      queueRow.status = "done";
      queueRow.lastCrawled = new Date();
    }

    // BFS discovery
    const links = [];
    $("a[href]").each((_, el) => {
      try {
        const abs = new URL($(el).attr("href"), queueRow.url).toString();
        if (abs.startsWith("http")) links.push(abs);
      } catch { }
    });
    console.log(`🔗 Found ${links.length} links on ${queueRow.url}`);

    const MAX_DEPTH = 1;
    if (queueRow.depth < MAX_DEPTH) {
      for (const url of links) {
        const seen = await CrawlQueue.findOne({ where: { url } });
        if (!seen) {
          await CrawlQueue.create({
            url,
            domain: new URL(url).hostname,
            depth: queueRow.depth + 1,
            status: "queued",
          });
          console.log(`➕ Enqueued new URL: ${url}`);
        }
      }
    }

    // Adaptive recrawl interval
    const visits = queueRow.visits || 1;
    const changes = queueRow.changes || 0;
    let riSeconds;
    if (visits < 3) {
      riSeconds = 60 * 30;
    } else {
      const cp = changes / visits;
      const MIN_RI = 60 * 5;
      riSeconds = Math.max(MIN_RI, Math.round((1 / Math.max(cp, 1e-6)) * 60));
      if (cp === 0) riSeconds = Math.min(60 * 60 * 24, riSeconds * 2);
    }
    queueRow.recrawlInterval = riSeconds;
    queueRow.nextCrawlAt = new Date(Date.now() + riSeconds * 1000);

    await queueRow.save();
    console.log(`💾 CrawlQueue updated: ${queueRow.url} | nextCrawlAt=${queueRow.nextCrawlAt}`);

    await page.close();
    await browser.close();
    console.log(`✅ [DONE] Crawled: ${queueRow.url}`);
    return { ok: true, changed };
  } catch (err) {
    console.error(`❌ [ERROR] ${queueRow.url}:`, err.message || err);
    try {
      queueRow.failCount = (queueRow.failCount || 0) + 1;
      queueRow.status = "failed";
      const backoffBase = 60;
      const next = Math.min(60 * 60 * 24, backoffBase * 2 ** (queueRow.failCount - 1));
      queueRow.nextCrawlAt = new Date(Date.now() + next * 1000);
      await queueRow.save();
      console.log(`⚠️ Scheduled retry for ${queueRow.url} at ${queueRow.nextCrawlAt}`);
    } catch { }
    if (browser) try { await browser.close(); } catch { }
    return { ok: false, err };
  }
}
