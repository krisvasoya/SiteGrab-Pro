/* eslint-disable no-undef */
// backend/src/services/downloader.js
// Downloads assets with adaptive concurrency, jitter retries, and optional plugin integrity checks.

const axios = require('axios');
const https = require('https');
const { URL } = require('url');
const path = require('path');
const featureFlags = require('../config/featureFlags');

const httpsAgent = new https.Agent({ rejectUnauthorized: false });

// Safe dynamic imports for optional integrity validations
let validateIntegrity = null;
if (featureFlags.ENABLE_INTEGRITY_CHECKS) {
  try {
    const validator = require('./plugins/integrityValidator');
    validateIntegrity = validator.validateIntegrity;
  } catch {
    console.log('ℹ️ [Downloader Plugin] integrityValidator.js not found. Integrity checks bypassed.');
  }
}

const DEFAULT_CONCURRENCY = parseInt(process.env.CONCURRENCY_LIMIT) || 5;
const MAX_FILE_MB         = parseInt(process.env.MAX_FILE_SIZE_MB)   || 50;
const REQUEST_TIMEOUT     = parseInt(process.env.REQUEST_TIMEOUT_MS)  || 30000;
const MAX_FILE_BYTES      = MAX_FILE_MB * 1024 * 1024;
const MAX_RETRIES         = 3;

// ── Shared Download Session ───────────────────────────────────────────────────
/**
 * DownloadSession tracks shared rate-limit state across all concurrent workers.
 * When any worker detects a 429/403, it sets isRateLimited = true and drops
 * activeConcurrency to 1.  After SAFE_MODE_RECOVERY_COUNT consecutive successes,
 * normal concurrency is automatically restored.
 */
class DownloadSession {
  constructor({ concurrency, requestDelay, cookies }) {
    this.targetConcurrency  = concurrency || DEFAULT_CONCURRENCY;
    this.activeConcurrency  = this.targetConcurrency;
    this.requestDelay       = requestDelay || 0;
    this.cookies            = cookies || null;   // Puppeteer cookie header string
    this.isRateLimited      = false;
    this._successStreak     = 0;
  }

  /** Called by a worker when it successfully downloads a file. */
  onSuccess() {
    this._successStreak++;
    // Recover normal concurrency after 10 consecutive successful downloads
    if (this.isRateLimited && this._successStreak >= 10) {
      this.isRateLimited     = false;
      this.activeConcurrency = this.targetConcurrency;
      console.log('[Downloader] Rate-limit Safe Mode lifted. Restoring normal concurrency.');
    }
  }

  /** Called by a worker on HTTP 429 or 403. */
  onRateLimit(url) {
    this.isRateLimited     = true;
    this.activeConcurrency = 1;
    this._successStreak    = 0;
    console.log(`[Downloader] 429/403 on ${url} — Safe Mode active (concurrency → 1).`);
  }

  /** Build request headers, injecting session cookies when available. */
  buildHeaders(referer) {
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept':     '*/*',
      'Referer':    referer || '',
    };
    if (this.cookies) {
      headers['Cookie'] = this.cookies;
    }
    return headers;
  }
}

// ── Core Downloader ───────────────────────────────────────────────────────────

/**
 * Download an array of asset URLs with adaptive concurrency limiting.
 * Uses a worker-pool pattern so concurrency can be changed mid-flight.
 *
 * @param {string[]}  urls
 * @param {string}    hostname
 * @param {object[]}  brokenLinks   — mutated in-place with failed assets
 * @param {Function}  onLog
 * @param {object}    options        — { concurrency, requestDelay, cookies }
 */
async function downloadAssets(urls, hostname, brokenLinks, onLog, options = {}) {
  const results = [];
  const queue   = [...urls];
  let done      = 0;
  const session = new DownloadSession(options);

  // Spawn `concurrency` worker coroutines that drain the queue independently.
  // This allows activeConcurrency to be read dynamically on each iteration.
  async function worker() {
    while (queue.length > 0) {
      // Respect rate-limit Safe Mode: only 1 worker proceeds at a time
      if (session.isRateLimited && session.activeConcurrency < session.targetConcurrency) {
        // Non-lead workers back off during Safe Mode
        await new Promise(r => setTimeout(r, 500));
        continue;
      }

      const url = queue.shift();
      if (!url) break;

      // Apply request throttling delay between downloads
      if (session.requestDelay > 0) {
        await new Promise(r => setTimeout(r, session.requestDelay));
      }

      try {
        const result = await downloadWithBackoff(url, session, MAX_RETRIES);
        results.push(result);
        session.onSuccess();
        done++;
        onLog(
          `Downloaded: ${result.localPath}`,
          Math.min(80, 72 + Math.floor((done / urls.length) * 8))
        );
      } catch (err) {
        const reason = err.message || 'unknown error';
        brokenLinks.push({ url: err._url || url, reason });
      }
    }
  }

  // Launch worker pool
  const workers = Array.from({ length: session.targetConcurrency }, () => worker());
  await Promise.all(workers);

  return results;
}

// ── Jitter Retry Download ─────────────────────────────────────────────────────

/**
 * Downloads a single URL with exponential-backoff jitter retries.
 * Detects 429/403 to activate session Safe Mode.
 *
 * Backoff formula: delay = (2^(MAX_RETRIES - retriesLeft)) * 1000 + random(0–1000) ms
 *
 * @param {string}          url
 * @param {DownloadSession} session
 * @param {number}          retriesLeft
 */
async function downloadWithBackoff(url, session, retriesLeft) {
  // Jitter delay grows exponentially with each retry
  const attemptIndex = MAX_RETRIES - retriesLeft;
  const delay = Math.pow(2, attemptIndex) * 1000 + Math.random() * 1000;

  // In Safe Mode, add extra pause before every attempt (including the first)
  if (session.isRateLimited) {
    await new Promise(r => setTimeout(r, delay + 2000));
  }

  let currentUrl = url;

  try {
    const response = await axios.get(currentUrl, {
      responseType:     'arraybuffer',
      timeout:          REQUEST_TIMEOUT,
      maxContentLength: MAX_FILE_BYTES,
      httpsAgent,
      headers:          session.buildHeaders(currentUrl),
    });

    const buffer = Buffer.from(response.data);
    if (buffer.length > MAX_FILE_BYTES) {
      throw Object.assign(new Error('File exceeds size limits'), { _url: url });
    }

    if (validateIntegrity) {
      validateIntegrity(buffer, currentUrl);
    }

    return { url: currentUrl, localPath: urlToLocalPath(currentUrl), buffer };

  } catch (err) {
    const status = err.response?.status;

    if (status === 429 || status === 403) {
      session.onRateLimit(url);
    }

    if (retriesLeft > 0) {
      // On the first retry, strip query params (helps some CDN cache misses)
      if (retriesLeft === MAX_RETRIES - 1 && currentUrl.includes('?')) {
        currentUrl = currentUrl.split('?')[0];
      }
      await new Promise(r => setTimeout(r, delay));
      return downloadWithBackoff(currentUrl, session, retriesLeft - 1);
    }

    // All retries exhausted — try browser fallback if deep crawl is enabled
    if (featureFlags.ENABLE_DEEP_CRAWL) {
      try {
        const buffer = await downloadViaBrowser(currentUrl);
        if (validateIntegrity) validateIntegrity(buffer, currentUrl);
        return { url: currentUrl, localPath: urlToLocalPath(currentUrl), buffer };
      } catch (browserErr) {
        err.message = `${err.message} (Browser Fallback failed: ${browserErr.message})`;
      }
    }

    err._url = url;
    throw err;
  }
}

// ── Browser Fallback ──────────────────────────────────────────────────────────

/**
 * Fallback: fetches assets via Puppeteer in-browser fetch() to bypass
 * CORS restrictions or cookie-authenticated CDN gating.
 */
async function downloadViaBrowser(url) {
  let page;
  try {
    const { getBrowser } = require('../utils/browser');
    const browser = getBrowser();
    page = await browser.newPage();
    await page.setViewport({ width: 1024, height: 768 });

    const parsedUrl = new URL(url);
    await page.goto(parsedUrl.origin, { waitUntil: 'domcontentloaded', timeout: 10000 }).catch(() => {});

    const base64Data = await page.evaluate(async (fetchUrl) => {
      const res = await fetch(fetchUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.onerror  = reject;
        reader.readAsDataURL(blob);
      });
    }, url);

    await page.close();
    return Buffer.from(base64Data, 'base64');
  } catch (err) {
    if (page) await page.close().catch(() => {});
    throw err;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function urlToLocalPath(rawUrl) {
  const parsed  = new URL(rawUrl);
  let filePath  = parsed.pathname;

  if (filePath.startsWith('/')) filePath = filePath.slice(1);

  if (!path.extname(filePath)) {
    filePath = path.join(filePath, 'index.html').replace(/\\/g, '/');
  }

  return filePath || 'index.html';
}

module.exports = { downloadAssets, urlToLocalPath };
