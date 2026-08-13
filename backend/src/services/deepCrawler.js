/* eslint-disable no-undef */
// backend/src/services/deepCrawler.js
// Dynamic SPA Crawler using Puppeteer evaluation. Safe to delete.

const cheerio = require('cheerio');
const { URL } = require('url');
const { getBrowser, createStealthPage } = require('../utils/browser');
const { extractAssetUrls } = require('./assetCollector');
const { downloadAssets } = require('./downloader');

const MAX_PAGES   = parseInt(process.env.MAX_PAGES_DEFAULT) || 20;
const PAGE_TIMEOUT = parseInt(process.env.AXIOS_TIMEOUT) || 25000;

/**
 * Smart Autoscroll — scrolls down in 400 px increments every 150 ms to
 * trigger lazy-loaded images, deferred <link> tags, and scroll animations.
 * Stops at document bottom or a 20 000 px safety ceiling, then scrolls
 * back to top to reveal any fixed/sticky header assets.
 *
 * @param {import('puppeteer').Page} page
 */
async function autoScroll(page) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      const distance  = 400;
      const timer = setInterval(() => {
        const scrollHeight = document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;
        if (totalHeight >= scrollHeight || totalHeight > 20000) {
          clearInterval(timer);
          // Scroll back to top to trigger top-fixed headers / sliders
          window.scrollTo(0, 0);
          resolve();
        }
      }, 150);
    });
  });
}


class DeepCrawlerService {
  constructor({ jobId, options, onLog }) {
    this.jobId = jobId;
    this.respectRobots = options.respectRobots !== false;
    this.maxDepth = Math.min(options.depth || 3, 5);
    this.assetTypes = options.assetTypes || ['html', 'css', 'js', 'images', 'fonts'];
    this.onLog = onLog;
    this.concurrency = options.concurrency || 2;
    this.requestDelay = options.requestDelay || 1000;

    this.visited = new Set();
    this.assetUrls = new Set();
    this.brokenLinks = [];
    this.pages = [];
    this.canvasAssets = [];
    this.blockedAssets = [];
  }

  log(message, percent = null) {
    console.log(`[DeepCrawler:${this.jobId}] ${message}`);
    this.onLog('progress', { message, ...(percent !== null ? { percent } : {}) });
  }

  async crawl(startUrl) {
    const hostname = new URL(startUrl).hostname;

    let browser;
    try {
      browser = getBrowser();
    } catch {
      throw new Error('Puppeteer browser is not initialized. Classic crawl falls back.');
    }

    let page;
    try {
      page = await createStealthPage(browser);
    } catch {
      page = await browser.newPage();
    }

    try {
      // Hijack Canvas 2D / 3D buffer preservation
      await page.evaluateOnNewDocument(() => {
        const origGetContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (type, attrs) {
          if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
            attrs = attrs || {};
            attrs.preserveDrawingBuffer = true;
          }
          return origGetContext.call(this, type, attrs);
        };
      });

      await page.setRequestInterception(true);
      
      // Asset filter to speed up crawler
      page.on('request', (req) => {
        const rt = req.resourceType();
        if (['media', 'websocket', 'ping', 'eventsource'].includes(rt)) {
          this.blockedAssets.push(req.url());
          req.abort();
        } else {
          req.continue();
        }
      });

      const queue = [{ url: startUrl, depth: 0 }];
      this.visited.add(startUrl);

      while (queue.length > 0 && this.pages.length < MAX_PAGES) {
        const { url, depth } = queue.shift();

        this.log(`Deep-Crawling page: ${url}`, Math.round((this.pages.length / MAX_PAGES) * 70));

        if (this.requestDelay > 0) {
          await new Promise(r => setTimeout(r, this.requestDelay));
        }

        try {
          await page.goto(url, { waitUntil: 'networkidle2', timeout: PAGE_TIMEOUT });

          const title = await page.title().catch(() => '');
          if (title.includes('One moment') || title.includes('Attention Required') || title.includes('Just a moment')) {
            this.log(`Anti-bot challenge detected on ${url} — waiting for JS challenge completion...`);
            await new Promise(r => setTimeout(r, 6000));
          }

          // Smart autoscroll: incrementally scrolls 400 px every 150 ms to
          // trigger all lazy-loaded images, deferred scripts, and CSS.
          await autoScroll(page);
          // Brief settle time for any scroll-triggered network requests
          await new Promise(r => setTimeout(r, 800));

          // WebGL / Canvas interceptors
          const hasWebGL = await page.evaluate(() => {
            const canvas = document.querySelector('canvas');
            if (!canvas) return false;
            return !!(canvas.getContext('webgl') || canvas.getContext('webgl2') || canvas.getContext('experimental-webgl'));
          });

          if (hasWebGL) {
            const canvasCaptures = await page.evaluate(() => {
              return new Promise((resolve) => {
                requestAnimationFrame(() => {
                  requestAnimationFrame(() => {
                    const results = [];
                    document.querySelectorAll('canvas').forEach((canvas, i) => {
                      try {
                        results.push({
                          index: i,
                          width: canvas.width,
                          height: canvas.height,
                          data: canvas.toDataURL('image/png', 1.0)
                        });
                      } catch (e) {
                        results.push({ index: i, error: 'cross-origin or empty' });
                      }
                    });
                    resolve(results);
                  });
                });
              });
            });

            canvasCaptures.forEach((cap) => {
              if (cap.data && !cap.error) {
                const base64Data = cap.data.replace(/^data:image\/png;base64,/, '');
                this.canvasAssets.push({
                  url: `canvas-${this.canvasAssets.length}-${cap.width}x${cap.height}.png`,
                  buffer: Buffer.from(base64Data, 'base64'),
                  localPath: `_captures/canvas-${this.canvasAssets.length}-${cap.width}x${cap.height}.png`
                });
              }
            });
          }

          // Full page High-Res Screenshot for SPA portfolio display
          if (url === startUrl) {
            await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });
            await new Promise(r => setTimeout(r, 500));
            const screenshotBuffer = await page.screenshot({
              fullPage: true,
              type: 'png'
            }).catch(() => null);

            if (screenshotBuffer) {
              this.canvasAssets.push({
                url: 'full-page-preview.png',
                buffer: screenshotBuffer,
                localPath: '_previews/full-page-preview.png'
              });
            }
          }

          const html = await page.content();
          if (html && html.trim().length > 0) {
            const $ = cheerio.load(html);
            
            // Extract assets
            const pageAssets = extractAssetUrls($, url, this.assetTypes, hostname);
            pageAssets.forEach(u => this.assetUrls.add(u));

            this.pages.push({ url, html });

            // BFS enqueue links
            if (depth < this.maxDepth) {
              $('a[href]').each((_, el) => {
                try {
                  const href = $(el).attr('href');
                  if (!href || /^(mailto:|tel:|#|javascript:)/i.test(href)) return;
                  const absUrl = new URL(href, url).href;
                  const parsed = new URL(absUrl);
                  
                  if (parsed.hostname === hostname && !this.visited.has(absUrl)) {
                    this.visited.add(absUrl);
                    queue.push({ url: absUrl, depth: depth + 1 });
                  }
                } catch (e) {
                  // Ignore invalid link formats
                }
              });
            }
          }
        } catch (err) {
          this.log(`Error crawling path ${url}: ${err.message}`);
          this.brokenLinks.push({ url, reason: err.message });
        }
      }

      // Extract Puppeteer session cookies before closing the page, so that
      // auth-gated / cookie-verified assets can be fetched successfully.
      let cookieHeader = '';
      try {
        const cookies = await page.cookies();
        cookieHeader  = cookies.map(c => `${c.name}=${c.value}`).join('; ');
      } catch (_) { /* non-fatal — proceed without cookies */ }

      await page.close();

      if (this.pages.length === 0) {
        throw new Error('Dynamic crawl failed to fetch any html content.');
      }

      this.log('Interactive routes analyzed. Downloading assets pool...', 72);

      const assets = await downloadAssets(
        [...this.assetUrls],
        hostname,
        this.brokenLinks,
        (msg, p) => this.log(msg, p),
        {
          concurrency:  this.concurrency,
          requestDelay: this.requestDelay,
          cookies:      cookieHeader || undefined,
        }
      );

      // Score evaluation
      const score = Math.max(20, Math.min(100, Math.round(100 - (this.brokenLinks.length * 8))));

      return {
        pages: this.pages,
        assets: [...assets, ...this.canvasAssets],
        brokenLinks: this.brokenLinks,
        blockedAssets: this.blockedAssets,
        score
      };

    } catch (err) {
      await page.close().catch(() => {});
      throw err;
    }
  }
}

module.exports = DeepCrawlerService;
