// ─────────────────────────────────────────
//  routes/crawl.js — POST /api/crawl
// ─────────────────────────────────────────
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { validateCrawlRequest } = require('../middleware/validateRequest');
const CrawlerService = require('../services/crawler');
const ZipperService = require('../services/zipper');
const { normalizeUrl, isSafeDomain } = require('../utils/urlUtils');

/**
 * POST /api/crawl
 * Body: { url, depth, assetTypes, respectRobots, minify }
 * Response: streams a ZIP file
 */
router.post('/crawl', validateCrawlRequest, async (req, res) => {
  const jobId = uuidv4();
  const {
    url,
    depth = 3,
    assetTypes = ['html', 'css', 'js', 'images', 'fonts'],
    respectRobots = true,
    minify = false,
  } = req.body;

  const normalizedUrl = normalizeUrl(url);

  // Safety check — block private IPs / localhost
  if (!isSafeDomain(normalizedUrl)) {
    return res.status(400).json({ error: 'URL points to a private or disallowed host.' });
  }

  console.log(`[${jobId}] Starting crawl → ${normalizedUrl} (depth=${depth})`);

  // Set SSE headers for live log streaming
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const sendEvent = (type, data) => {
    if (!res.writableEnded) {
      res.write(`data: ${JSON.stringify({ type, ...data })}\n\n`);
    }
  };

  try {
    const crawler = new CrawlerService({ jobId, respectRobots, depth, assetTypes, onLog: sendEvent });
    const { pages, assets, brokenLinks } = await crawler.crawl(normalizedUrl);

    sendEvent('progress', { percent: 80, message: 'Building ZIP…' });

    const zipper = new ZipperService({ jobId, minify, brokenLinks, originalUrl: normalizedUrl });
    const zipBuffer = await zipper.build(pages, assets);

    sendEvent('progress', { percent: 100, message: 'Done!' });
    sendEvent('complete', {
      fileCount: assets.length,
      pageCount: pages.length,
      brokenCount: brokenLinks.length,
      sizeBytes: zipBuffer.length,
    });

    // Send the ZIP as base64 in a final event so SSE client can trigger download
    sendEvent('zip', { data: zipBuffer.toString('base64') });
    res.end();
  } catch (err) {
    console.error(`[${jobId}] Crawl failed:`, err.message);
    sendEvent('error', { message: err.message || 'Unexpected server error.' });
    res.end();
  }
});

module.exports = router;
