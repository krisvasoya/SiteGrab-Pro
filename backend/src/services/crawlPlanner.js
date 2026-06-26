/* eslint-disable no-undef */
// backend/src/services/crawlPlanner.js
// Profiles target websites to recommend optimal crawl configurations. Safe to delete.

const cheerio = require('cheerio');
const { getBrowser } = require('../utils/browser');

class CrawlPlannerService {
  constructor({ jobId, onProgress }) {
    this.jobId = jobId;
    this.onProgress = onProgress || (() => {});
  }

  progress(percent, message) {
    this.onProgress({ percent, message });
  }

  async analyze(targetUrl) {
    this.progress(10, 'Spawning AI Puppeteer browser instance...');
    let browser;
    try {
      browser = getBrowser();
    } catch {
      throw new Error('Puppeteer browser is not active. Enable deep crawling to profile pages.');
    }

    const page = await browser.newPage();
    this.progress(25, `Connecting and profiling: ${targetUrl}`);

    try {
      const startTime = Date.now();
      await page.goto(targetUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 20000
      });
      const loadTimeMs = Date.now() - startTime;

      this.progress(45, 'Evaluating document architecture & frameworks...');

      // Profile framework footprints
      const pageProfile = await page.evaluate(() => {
        const scripts = Array.from(document.querySelectorAll('script')).map(s => s.src.toLowerCase());
        const hasReact = !!window.React || !!document.querySelector('[data-reactroot]') || scripts.some(s => s.includes('react'));
        const hasNext = !!window.__NEXT_DATA__ || scripts.some(s => s.includes('_next'));
        const hasAngular = !!window.angular || !!document.querySelector('[ng-version]') || scripts.some(s => s.includes('angular'));
        const hasVue = !!window.Vue || scripts.some(s => s.includes('vue'));
        const hasWordPress = scripts.some(s => s.includes('wp-content')) || !!document.querySelector('meta[name="generator"]')?.content?.toLowerCase().includes('wordpress');
        const hasCloudflare = scripts.some(s => s.includes('cloudflare')) || !!document.querySelector('script[src*="turnstile"]');

        const totalNodes = document.getElementsByTagName('*').length;
        const textLength = document.body ? document.body.innerText.length : 0;
        const htmlLength = document.documentElement.outerHTML.length;

        // Lazy-loaded or Infinite Scroll signals
        const hasLazyImages = !!document.querySelector('img[loading="lazy"]') || !!document.querySelector('img[data-src]');
        const hasInfiniteScroll = window.innerHeight < (document.body ? document.body.scrollHeight : 0);

        return {
          hasReact,
          hasNext,
          hasAngular,
          hasVue,
          hasWordPress,
          hasCloudflare,
          totalNodes,
          textLength,
          htmlLength,
          hasLazyImages,
          hasInfiniteScroll
        };
      });

      this.progress(70, 'Analyzing assets & DOM complexity ratios...');
      const html = await page.content();
      const $ = cheerio.load(html);

      // DOM & Link Extraction
      const links = new Set();
      $('a[href]').each((_, el) => {
        const href = $(el).attr('href');
        if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
          links.add(href);
        }
      });

      // Assess asset counts
      const assets = {
        images: $('img').length,
        stylesheets: $('link[rel="stylesheet"]').length,
        scripts: $('script[src]').length,
        fonts: $('link[href*="font"]').length
      };

      // Form triggers / Login block checks
      const hasLoginForm = $('form input[type="password"]').length > 0;

      await page.close();

      this.progress(90, 'Formulating recommended crawler rules...');

      // Framework classification
      let architecture = 'Classic Static HTML';
      let recommendedMode = 'standard';
      
      if (pageProfile.hasReact || pageProfile.hasVue || pageProfile.hasAngular || pageProfile.hasNext) {
        architecture = pageProfile.hasNext ? 'Next.js SSR' : 'Client-Side SPA Framework';
        recommendedMode = 'deep';
      } else if (pageProfile.hasWordPress) {
        architecture = 'WordPress CMS';
      }

      // Complexity classification
      let complexity = 'Low';
      if (pageProfile.totalNodes > 1500 || links.size > 80) {
        complexity = 'High';
      } else if (pageProfile.totalNodes > 600 || links.size > 30) {
        complexity = 'Medium';
      }

      // Barrier warnings
      const warnings = [];
      if (pageProfile.hasCloudflare) {
        warnings.push({
          type: 'shield',
          title: 'Cloudflare / CAPTCHA Shield Detected',
          text: 'The site uses Cloudflare browser verification. Crawl rate should be throttled to prevent blocks.'
        });
      }
      if (hasLoginForm) {
        warnings.push({
          type: 'lock',
          title: 'Authentication Form Scanned',
          text: 'A user login form was detected on the homepage. Gated dashboard content will not be crawled offline.'
        });
      }
      if (pageProfile.hasInfiniteScroll || pageProfile.hasLazyImages) {
        warnings.push({
          type: 'scroll',
          title: 'Dynamic Lazy-Loaded Assets',
          text: 'Image files or lists are loaded dynamically. Dynamic evaluation (Deep Crawl) is highly recommended.'
        });
      }

      // Calculate recommendations
      const recommendedSettings = {
        mode: recommendedMode,
        depth: recommendedMode === 'deep' ? 2 : 3,
        concurrency: recommendedMode === 'deep' ? 2 : 4,
        requestDelay: recommendedMode === 'deep' ? 1200 : 400,
        assetTypes: ['html', 'css', 'js', 'images', 'fonts']
      };

      // Time estimate based on complexity and load time
      const estPages = recommendedSettings.depth * 8;
      const totalTimeSec = Math.round((estPages * (loadTimeMs + recommendedSettings.requestDelay)) / 1000);
      const formattedTime = totalTimeSec > 60 
        ? `${Math.floor(totalTimeSec / 60)}m ${totalTimeSec % 60}s` 
        : `${totalTimeSec}s`;

      return {
        architecture,
        complexity,
        loadTimeMs,
        linksCount: links.size,
        assetsCount: assets.images + assets.stylesheets + assets.scripts + assets.fonts,
        recommendedSettings,
        warnings,
        timeEstimate: formattedTime,
        potentialFileCount: assets.images + assets.stylesheets + assets.scripts + assets.fonts + estPages
      };

    } catch (err) {
      if (page) await page.close().catch(() => {});
      throw err;
    }
  }
}

module.exports = CrawlPlannerService;
