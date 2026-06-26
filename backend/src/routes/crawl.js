// backend/src/routes/crawl.js
// Handles crawler HTTP / SSE endpoints with feature flag guardrails.

const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { validateCrawlRequest } = require('../middleware/validateRequest');
const CrawlerService = require('../services/crawler');
const ZipperService = require('../services/zipper');
const { normalizeUrl, isSafeDomain } = require('../utils/urlUtils');
const featureFlags = require('../config/featureFlags');

// Safe dynamic imports for optional services (Safe to Delete)
let CrawlPlannerService = null;
let DeepCrawlerService  = null;
let initBrowser         = null;

// Load browser utility independently — needed by both AI Planner and Deep Crawler
if (featureFlags.ENABLE_AI_PLANNER || featureFlags.ENABLE_DEEP_CRAWL) {
  try {
    const browserUtil = require('../utils/browser');
    initBrowser = browserUtil.initBrowser;
    console.log('✅ [Crawl Route] Puppeteer browser utility loaded.');
  } catch {
    console.log('ℹ️ [Crawl Route] browser.js not found or puppeteer unavailable. Browser features disabled.');
  }
}

if (featureFlags.ENABLE_AI_PLANNER) {
  try {
    CrawlPlannerService = require('../services/crawlPlanner');
    console.log('✅ [Crawl Route] AI Pre-Crawl Scanner loaded.');
  } catch {
    console.log('ℹ️ [Crawl Route] crawlPlanner.js not found. AI Pre-Crawl scanner disabled.');
  }
}

if (featureFlags.ENABLE_DEEP_CRAWL) {
  try {
    DeepCrawlerService = require('../services/deepCrawler');
    console.log('✅ [Crawl Route] Deep Crawler (Puppeteer) loaded.');
  } catch {
    console.log('ℹ️ [Crawl Route] deepCrawler.js not found. Deep Crawling disabled.');
  }
}

/**
 * Setup helper for SSE (Server-Sent Events) live log streaming
 */
function setupSSE(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  return (type, data) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    }
  };
}

/**
 * POST /api/analyze
 * SSE-backed live AI Pre-Crawl Scanner. Falls back safely if disabled/deleted.
 */
router.post('/analyze', async (req, res) => {
  const jobId = uuidv4();
  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required for analysis.' });
  }

  const normalizedUrl = normalizeUrl(url);
  if (!isSafeDomain(normalizedUrl)) {
    return res.status(400).json({ error: 'URL points to a private or disallowed host.' });
  }

  // Fallback checks
  if (!featureFlags.ENABLE_AI_PLANNER || !CrawlPlannerService) {
    return res.status(501).json({ error: 'AI Planner service is currently disabled or deleted.' });
  }

  const sendEvent = setupSSE(res);
  console.log(`[${jobId}] Starting pre-crawl analysis for ${normalizedUrl}...`);

  try {
    // Lazy launch Puppeteer browser singleton for planning sweeps
    if (initBrowser) {
      await initBrowser().catch(() => {});
    }

    const planner = new CrawlPlannerService({
      jobId,
      onProgress: ({ percent, message }) => {
        sendEvent('progress', { percent, message });
      }
    });

    const report = await planner.analyze(normalizedUrl);
    sendEvent('done', { report });
    res.end();
  } catch (err) {
    console.error(`[${jobId}] Analysis failed:`, err.message);
    sendEvent('error', { message: err.message || 'AI scanner got disconnected.' });
    res.end();
  }
});

/**
 * POST /api/crawl
 * Integrates both Standard crawls and Deep crawls using fallback patterns
 */
router.post('/crawl', validateCrawlRequest, async (req, res) => {
  const jobId = uuidv4();
  const {
    url,
    depth = 3,
    assetTypes = ['html', 'css', 'js', 'images', 'fonts'],
    respectRobots = true,
    minify = false,
    mode = 'standard',
    concurrency,
    requestDelay
  } = req.body;

  const normalizedUrl = normalizeUrl(url);
  if (!isSafeDomain(normalizedUrl)) {
    return res.status(400).json({ error: 'URL points to a private or disallowed host.' });
  }

  const sendEvent = setupSSE(res);
  console.log(`[${jobId}] Starting ${mode} crawl for ${normalizedUrl}...`);

  try {
    let pages, assets, brokenLinks, blockedAssets = [], score = 100;

    // Route dynamically based on mode and availability
    if (mode === 'deep' && featureFlags.ENABLE_DEEP_CRAWL && DeepCrawlerService) {
      if (initBrowser) {
        await initBrowser().catch(() => {});
      }
      const crawler = new DeepCrawlerService({
        jobId,
        options: { depth, assetTypes, respectRobots, concurrency, requestDelay },
        onLog: sendEvent
      });
      const deepResult = await crawler.crawl(normalizedUrl);
      pages = deepResult.pages;
      assets = deepResult.assets;
      brokenLinks = deepResult.brokenLinks;
      blockedAssets = deepResult.blockedAssets || [];
      score = deepResult.score || 100;
    } else {
      // Fallback directly to classic Cheerio crawler
      const crawler = new CrawlerService({
        jobId, respectRobots, depth, assetTypes, onLog: sendEvent, concurrency, requestDelay
      });
      const stdResult = await crawler.crawl(normalizedUrl);
      pages = stdResult.pages;
      assets = stdResult.assets;
      brokenLinks = stdResult.brokenLinks;
    }

    sendEvent('progress', { percent: 80, message: 'Building ZIP output…' });

    // Pack scraped assets
    const zipper = new ZipperService({ jobId, minify, brokenLinks, originalUrl: normalizedUrl });
    const zipBuffer = await zipper.build(pages, assets);
    const zipPath = path.join(os.tmpdir(), `sitegrab-${jobId}.zip`);
    fs.writeFileSync(zipPath, zipBuffer);
    const sizeBytes = zipBuffer.length;

    // Optional success verification audit report
    let postCrawlReport = null;
    if (featureFlags.ENABLE_POST_CRAWL_REPORT) {
      const totalAttempted = assets.length + brokenLinks.length;
      const successRate = totalAttempted > 0 ? Math.round((assets.length / totalAttempted) * 100) : 100;
      
      // Map error recommendation strategies
      const failedAssets = brokenLinks.map((item) => {
        let fix = 'Check if resources are accessible on the live domain.';
        if (item.reason.includes('404')) fix = 'Broken path. Verify if link was moved or deleted.';
        if (item.reason.includes('timeout')) fix = 'Slow server response. Try raising timeouts or delay times.';
        if (item.reason.includes('403')) fix = 'CORS barrier. Enable dynamic browser cookies or proxy servers.';

        return {
          url: item.url,
          reason: item.reason,
          type: path.extname(item.url.split('?')[0]) || 'other',
          fix
        };
      });

      postCrawlReport = {
        totalAttempted,
        successful: assets.length,
        failed: brokenLinks.length,
        successRate,
        failedAssets
      };
    }

    sendEvent('progress', { percent: 100, message: 'Grab complete!' });
    sendEvent('complete', {
      fileCount: assets.length,
      pageCount: pages.length,
      brokenCount: brokenLinks.length,
      sizeBytes
    });

    // Provide download URL and structural stats
    sendEvent('done', {
      downloadUrl: `/api/download/${jobId}`,
      stats: {
        pages: pages.length,
        assets: assets.length,
        broken: brokenLinks.length,
        blocked: blockedAssets.length,
        zipSizeMB: (sizeBytes / 1024 / 1024).toFixed(2),
        score,
        webgl: {
          detected: assets.some(a => a.localPath.startsWith('_captures/')),
          canvasCaptureCount: assets.filter(a => a.localPath.startsWith('_captures/')).length
        },
        postCrawlReport
      }
    });

    res.end();
  } catch (err) {
    console.error(`[${jobId}] Crawl execution failed:`, err.message);
    sendEvent('error', { message: err.message || 'Unexpected server execution error.' });
    res.end();
  }
});

/**
 * GET /api/download/:jobId
 * Download dynamic ZIP archive from local storage
 */
router.get('/download/:jobId', (req, res) => {
  const jobId = req.params.jobId;
  const zipPath = path.join(os.tmpdir(), `sitegrab-${jobId}.zip`);

  if (!fs.existsSync(zipPath)) {
    return res.status(404).send('ZIP file has expired or was not created.');
  }

  res.download(zipPath, `sitegrab-${jobId}.zip`, (err) => {
    if (err) console.error('Download execution error:', err);
    
    // Auto-cleanup temp zip files to keep server disks clean
    fs.unlink(zipPath, () => {});
  });
});

module.exports = router;
