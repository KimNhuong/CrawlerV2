import puppeteer from "puppeteer-core";

const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"; // path bạn đã kiểm tra

const main = async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  });

  const page = await browser.newPage();
  await page.goto("https://example.com", { waitUntil: "networkidle2" });

  const title = await page.title();
  console.log("Page title:", title);

  await browser.close();
};

main();
