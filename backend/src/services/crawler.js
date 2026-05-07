// ─────────────────────────────────────────
//  services/crawler.js — Puppeteer BFS Crawler
// ─────────────────────────────────────────
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const cheerio = require('cheerio');
const axios = require('axios');
const { URL } = require('url');
const { parseRobotsTxt, isAllowed } = require('../utils/robotsParser');
const { extractAssetUrls } = require('./assetCollector');
const { downloadAssets } = require('./downloader');

// ── Stealth Setup ───────────────────────
// On Vercel, some stealth evasions cause 'Module Not Found' errors due to bundling.
const stealth = StealthPlugin();
stealth.enabledEvasions.delete('chrome.app');
stealth.enabledEvasions.delete('chrome.csi');
stealth.enabledEvasions.delete('chrome.loadTimes');
stealth.enabledEvasions.delete('chrome.runtime');
puppeteer.use(stealth);

const MAX_PAGES      = parseInt(process.env.MAX_PAGES_DEFAULT) || 20;
const CRAWL_DELAY_MS = parseInt(process.env.CRAWL_DELAY_MS)    || 800;
const PUP_TIMEOUT    = parseInt(process.env.PUPPETEER_TIMEOUT)  || 30000;

class CrawlerService {
  constructor({ jobId, respectRobots, depth, assetTypes, onLog }) {
    this.jobId        = jobId;
    this.respectRobots = respectRobots;
    this.maxDepth     = Math.min(depth, parseInt(process.env.MAX_CRAWL_DEPTH) || 10);
    this.assetTypes   = assetTypes;
    this.onLog        = onLog;
    this.visited      = new Set();
    this.assetUrls    = new Set();
    this.brokenLinks  = [];
    this.pages        = [];
  }

  log(message, percent = null) {
    console.log(`[${this.jobId}] ${message}`);
    this.onLog('progress', { message, ...(percent !== null ? { percent } : {}) });
  }

  async crawl(startUrl) {
    const origin = new URL(startUrl).origin;
    const hostname = new URL(startUrl).hostname;

    // ── robots.txt ───────────────────────────
    let robotsRules = null;
    if (this.respectRobots) {
      try {
        const robotsUrl = `${origin}/robots.txt`;
        const { data } = await axios.get(robotsUrl, { timeout: 5000 });
        robotsRules = parseRobotsTxt(data);
        this.log('robots.txt fetched and parsed.');
      } catch {
        this.log('No robots.txt found or unreachable — proceeding.');
      }
    }

    // ── Launch browser ───────────────────────
    const isDev = process.env.NODE_ENV === 'development' || !process.env.VERCEL;
    let chromium = null;

    if (!isDev) {
      chromium = await import('@sparticuz/chromium');
    }
    
    const browser = await puppeteer.launch({
      args: isDev ? ['--no-sandbox'] : chromium.args,
      defaultViewport: isDev ? null : chromium.defaultViewport,
      executablePath: isDev ? undefined : await chromium.executablePath(),
      headless: isDev ? true : chromium.headless,
      ignoreHTTPSErrors: true,
    });

    try {
      // ── BFS crawl ───────────────────────────
      const queue = [{ url: startUrl, depth: 0 }];
      this.visited.add(startUrl);

      while (queue.length > 0 && this.pages.length < MAX_PAGES) {
        const { url: currentUrl, depth: currentDepth } = queue.shift();

        if (robotsRules && !isAllowed(robotsRules, currentUrl)) {
          this.log(`Skipping (robots.txt disallows): ${currentUrl}`);
          continue;
        }

        this.log(`Crawling [${this.pages.length + 1}]: ${currentUrl}`, Math.round((this.pages.length / MAX_PAGES) * 70));

        const page = await browser.newPage();
        const networkAssets = new Set();

        // ── Intercept ALL network requests ──────
        await page.setRequestInterception(true);
        page.on('request', (req) => {
          const reqUrl = req.url();
          if (!reqUrl.startsWith('data:') && new URL(reqUrl).hostname === hostname) {
            networkAssets.add(reqUrl);
          }
          req.continue();
        });

        try {
          await page.goto(currentUrl, { waitUntil: 'networkidle2', timeout: PUP_TIMEOUT });

          const html = await page.content();
          const $ = cheerio.load(html);

          // Collect assets from HTML + intercepted network
          const pageAssets = extractAssetUrls($, currentUrl, this.assetTypes, hostname);
          [...networkAssets].forEach((u) => this.assetUrls.add(u));
          pageAssets.forEach((u) => this.assetUrls.add(u));

          this.pages.push({ url: currentUrl, html });

          // Enqueue same-domain links if depth allows
          if (currentDepth < this.maxDepth) {
            $('a[href]').each((_, el) => {
              try {
                const href = new URL($(el).attr('href'), currentUrl).href;
                const parsedUrl = new URL(href);
                
                // Skip PHP files to avoid crawling dynamic server-side pages
                if (parsedUrl.pathname.toLowerCase().endsWith('.php')) {
                  return;
                }

                if (parsedUrl.hostname === hostname && !this.visited.has(href)) {
                  this.visited.add(href);
                  queue.push({ url: href, depth: currentDepth + 1 });
                }
              } catch { /* ignore malformed hrefs */ }
            });
          }
        } catch (err) {
          this.log(`Error crawling ${currentUrl}: ${err.message}`);
          this.brokenLinks.push({ url: currentUrl, reason: err.message });
        } finally {
          await page.close();
          await this._delay(CRAWL_DELAY_MS);
        }
      }
    } finally {
      await browser.close();
    }

    // ── Download all collected assets ────────
    this.log('All pages crawled. Downloading assets…', 72);
    const assets = await downloadAssets(
      [...this.assetUrls],
      hostname,
      this.brokenLinks,
      (msg, p) => this.log(msg, p)
    );

    return { pages: this.pages, assets, brokenLinks: this.brokenLinks };
  }

  _delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
}

module.exports = CrawlerService;
