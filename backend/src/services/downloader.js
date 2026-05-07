// ─────────────────────────────────────────
//  services/downloader.js
//  Downloads assets with concurrency + retry
// ─────────────────────────────────────────
const axios = require('axios');
const { URL } = require('url');
const path = require('path');

const CONCURRENCY     = parseInt(process.env.CONCURRENCY_LIMIT) || 5;
const MAX_FILE_MB     = parseInt(process.env.MAX_FILE_SIZE_MB)   || 50;
const REQUEST_TIMEOUT = parseInt(process.env.REQUEST_TIMEOUT_MS)  || 30000;
const MAX_FILE_BYTES  = MAX_FILE_MB * 1024 * 1024;

/**
 * Download an array of asset URLs with concurrency limiting.
 * Returns array of { url, localPath, buffer }.
 */
async function downloadAssets(urls, hostname, brokenLinks, onLog) {
  const results = [];
  const total = urls.length;
  let done = 0;

  // Process in batches of CONCURRENCY
  for (let i = 0; i < urls.length; i += CONCURRENCY) {
    const batch = urls.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(batch.map((url) => downloadOne(url, hostname)));

    for (const result of settled) {
      done++;
      if (result.status === 'fulfilled' && result.value) {
        results.push(result.value);
        onLog(`Downloaded: ${result.value.localPath}`, 72 + Math.round((done / total) * 8));
      } else {
        const reason = result.reason?.message || 'unknown error';
        const url    = result.reason?._url || '?';
        brokenLinks.push({ url, reason });
      }
    }
  }

  return results;
}

async function downloadOne(url, hostname) {
  try {
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: REQUEST_TIMEOUT,
      maxContentLength: MAX_FILE_BYTES,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SiteGrabBot/1.0)',
      },
    });

    const buffer = Buffer.from(response.data);
    if (buffer.length > MAX_FILE_BYTES) {
      const err = new Error(`File too large (${(buffer.length / 1024 / 1024).toFixed(1)} MB)`);
      err._url = url;
      throw err;
    }

    return { url, localPath: urlToLocalPath(url, hostname), buffer };
  } catch (err) {
    err._url = url;
    throw err;
  }
}

/**
 * Converts an absolute URL to a relative local path, mirroring the site hierarchy.
 * https://example.com/css/main.css → css/main.css
 */
function urlToLocalPath(rawUrl, hostname) {
  const parsed = new URL(rawUrl);
  let filePath  = parsed.pathname;

  // Strip leading slash
  if (filePath.startsWith('/')) filePath = filePath.slice(1);

  // If no extension — treat as directory index
  if (!path.extname(filePath)) {
    filePath = path.join(filePath, 'index.html').replace(/\\/g, '/');
  }

  return filePath || 'index.html';
}

module.exports = { downloadAssets, urlToLocalPath };
