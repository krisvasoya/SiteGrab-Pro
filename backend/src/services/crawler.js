// ─────────────────────────────────────────
//  services/crawler.js — Axios + Cheerio Crawler
// ─────────────────────────────────────────
const cheerio = require('cheerio');
const axios = require('axios');
const { URL } = require('url');
const { parseRobotsTxt, isAllowed } = require('../utils/robotsParser');
const { extractAssetUrls } = require('./assetCollector');
const { downloadAssets } = require('./downloader');

const MAX_PAGES      = parseInt(process.env.MAX_PAGES_DEFAULT) || 20;
const CRAWL_DELAY_MS = parseInt(process.env.CRAWL_DELAY_MS)    || 800;
const AXIOS_TIMEOUT  = parseInt(process.env.AXIOS_TIMEOUT)      || 10000;

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
        const { data } = await axios.get(robotsUrl, { 
          timeout: 5000,
          headers: { 'User-Agent': 'SiteGrabPro/1.0' }
        });
        robotsRules = parseRobotsTxt(data);
        this.log('robots.txt fetched and parsed.');
      } catch {
        this.log('No robots.txt found or unreachable — proceeding.');
      }
    }

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

      try {
        const response = await axios.get(currentUrl, {
          timeout: AXIOS_TIMEOUT,
          headers: { 
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8'
          }
        });

        const html = response.data;
        if (typeof html !== 'string') throw new Error('Response is not HTML text');

        const $ = cheerio.load(html);

        // Collect assets from HTML
        const pageAssets = extractAssetUrls($, currentUrl, this.assetTypes, hostname);
        pageAssets.forEach((u) => this.assetUrls.add(u));

        this.pages.push({ url: currentUrl, html });

        // Enqueue same-domain links if depth allows
        if (currentDepth < this.maxDepth) {
          $('a[href]').each((_, el) => {
            try {
              const hrefAttr = $(el).attr('href');
              if (!hrefAttr) return;

              const absoluteUrl = new URL(hrefAttr, currentUrl).href;
              const parsedUrl = new URL(absoluteUrl);
              
              // Skip PHP, mailto, tel, etc.
              if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') return;
              if (parsedUrl.pathname.toLowerCase().endsWith('.php')) return;

              if (parsedUrl.hostname === hostname && !this.visited.has(absoluteUrl)) {
                this.visited.add(absoluteUrl);
                queue.push({ url: absoluteUrl, depth: currentDepth + 1 });
              }
            } catch { /* ignore malformed hrefs */ }
          });
        }
      } catch (err) {
        this.log(`Error crawling ${currentUrl}: ${err.message}`);
        this.brokenLinks.push({ url: currentUrl, reason: err.message });
      }

      await this._delay(CRAWL_DELAY_MS);
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
