// backend/src/services/crawler.js
// Standard Axios + Cheerio Crawler with support for rate-limits and concurrency.

const cheerio = require('cheerio');
const axios   = require('axios');
const https   = require('https');
const { URL } = require('url');
const { parseRobotsTxt, isAllowed } = require('../utils/robotsParser');
const { extractAssetUrls }          = require('./assetCollector');
const { downloadAssets }            = require('./downloader');

const MAX_PAGES      = parseInt(process.env.MAX_PAGES_DEFAULT) || 20;
const CRAWL_DELAY_MS = parseInt(process.env.CRAWL_DELAY_MS)    || 800;
const AXIOS_TIMEOUT  = parseInt(process.env.AXIOS_TIMEOUT)     || 20000;

// Shared Axios client with SSL bypasses & user-agent rotation headers
const httpClient = axios.create({
  timeout:      AXIOS_TIMEOUT,
  maxRedirects: 10,
  httpsAgent:   new https.Agent({ rejectUnauthorized: false }),
  validateStatus: (s) => s < 400,
  headers: {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept':
      'text/html,application/xhtml+xml,application/xml;q=0.9,' +
      'image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language':           'en-US,en;q=0.9',
    'Connection':                'keep-alive',
  },
});

class CrawlerService {
  constructor({ jobId, respectRobots, depth, assetTypes, onLog, concurrency, requestDelay }) {
    this.jobId         = jobId;
    this.respectRobots = respectRobots;
    this.maxDepth      = Math.min(depth, parseInt(process.env.MAX_CRAWL_DEPTH) || 10);
    this.assetTypes    = assetTypes;
    this.onLog         = onLog;
    
    // Fallback options
    this.concurrency   = concurrency || parseInt(process.env.CONCURRENCY_LIMIT) || 5;
    this.requestDelay  = requestDelay !== undefined ? requestDelay : CRAWL_DELAY_MS;

    this.visited       = new Set();
    this.assetUrls     = new Set();
    this.brokenLinks   = [];
    this.pages         = [];
  }

  log(message, percent = null) {
    console.log(`[Crawler:${this.jobId}] ${message}`);
    this.onLog('progress', { message, ...(percent !== null ? { percent } : {}) });
  }

  async crawl(startUrl) {
    const origin   = new URL(startUrl).origin;
    const hostname = new URL(startUrl).hostname;

    // HTTP / HTTPS Auto-fallback
    let workingUrl = startUrl;
    try {
      await httpClient.head(startUrl, { timeout: 6000 });
    } catch {
      const fallback = startUrl.replace(/^https:\/\//, 'http://');
      this.log(`HTTPS connection failed — attempting HTTP fallback: ${fallback}`);
      workingUrl = fallback;
    }

    // robots.txt Parser
    let robotsRules = null;
    if (this.respectRobots) {
      try {
        const { data } = await httpClient.get(`${origin}/robots.txt`, { timeout: 5000 });
        robotsRules = parseRobotsTxt(data);
        this.log('robots.txt fetched and parsed.');
      } catch {
        this.log('No robots.txt found — proceeding.');
      }
    }

    const queue = [{ url: workingUrl, depth: 0 }];
    this.visited.add(workingUrl);
    this.visited.add(startUrl);

    // BFS crawl loop
    while (queue.length > 0 && this.pages.length < MAX_PAGES) {
      const { url: currentUrl, depth: currentDepth } = queue.shift();

      if (robotsRules && !isAllowed(robotsRules, currentUrl)) {
        this.log(`Skipping (robots.txt): ${currentUrl}`);
        continue;
      }

      this.log(
        `Crawling page [${this.pages.length + 1}]: ${currentUrl}`,
        Math.round((this.pages.length / MAX_PAGES) * 70)
      );

      // Support custom crawler throttling delay settings
      if (this.requestDelay > 0) {
        await this._delay(this.requestDelay);
      }

      try {
        const response = await httpClient.get(currentUrl, {
          headers: { Referer: origin },
        });

        const ct = response.headers['content-type'] || '';
        if (!ct.includes('html') && !ct.includes('text')) {
          this.assetUrls.add(currentUrl);
          continue;
        }

        const html = response.data;
        if (typeof html !== 'string' || html.trim().length === 0) {
          this.log(`Empty page body: ${currentUrl}`);
          continue;
        }

        const $ = cheerio.load(html);
        const pageAssets = extractAssetUrls($, currentUrl, this.assetTypes);
        pageAssets.forEach((u) => this.assetUrls.add(u));

        this.pages.push({ url: currentUrl, html });

        if (currentDepth < this.maxDepth) {
          $('a[href]').each((_, el) => {
            try {
              const hrefAttr = $(el).attr('href');
              if (!hrefAttr || /^(mailto:|tel:|#|javascript:)/i.test(hrefAttr)) return;

              const absoluteUrl = new URL(hrefAttr, currentUrl).href;
              const parsedUrl   = new URL(absoluteUrl);

              if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') return;

              const assetHostname = parsedUrl.hostname.replace(/^www\./, '');
              const baseHostname  = hostname.replace(/^www\./, '');

              if (assetHostname === baseHostname && !this.visited.has(absoluteUrl)) {
                this.visited.add(absoluteUrl);
                queue.push({ url: absoluteUrl, depth: currentDepth + 1 });
              }
            } catch (e) {
              // Ignore invalid link structures
            }
          });
        }
      } catch (err) {
        const code   = err.response?.status;
        const reason = code ? `HTTP ${code}` : err.message;
        this.log(`Failed [${reason}]: ${currentUrl}`);
        this.brokenLinks.push({ url: currentUrl, reason });
      }
    }

    if (this.pages.length === 0) {
      throw new Error(`Could not fetch any page from "${hostname}". Checks your connection or robots.txt settings.`);
    }

    this.log('Pages crawled. Downloading assets pool…', 72);
    const assets = await downloadAssets(
      [...this.assetUrls],
      hostname,
      this.brokenLinks,
      (msg, p) => this.log(msg, p),
      {
        concurrency: this.concurrency,
        requestDelay: this.requestDelay
      }
    );

    return { pages: this.pages, assets, brokenLinks: this.brokenLinks };
  }

  _delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
}

module.exports = CrawlerService;