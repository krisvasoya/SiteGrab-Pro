// ─────────────────────────────────────────
//  middleware/validateRequest.js
// ─────────────────────────────────────────

const VALID_ASSET_TYPES = ['html', 'css', 'js', 'images', 'fonts', 'video', 'audio', 'models', 'shaders', 'wasm', 'json'];

function validateCrawlRequest(req, res, next) {
  const { url, depth, assetTypes } = req.body;

  if (!url || typeof url !== 'string' || url.trim().length === 0) {
    return res.status(400).json({ error: 'A valid URL is required.' });
  }

  // Basic URL format check
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    if (!['http:', 'https:'].includes(u.protocol)) {
      return res.status(400).json({ error: 'Only HTTP and HTTPS URLs are supported.' });
    }
  } catch {
    return res.status(400).json({ error: 'Invalid URL format.' });
  }

  if (depth !== undefined) {
    const d = parseInt(depth);
    if (isNaN(d) || d < 1 || d > 10) {
      return res.status(400).json({ error: 'Crawl depth must be between 1 and 10.' });
    }
  }

  if (assetTypes !== undefined) {
    if (!Array.isArray(assetTypes) || assetTypes.some((t) => !VALID_ASSET_TYPES.includes(t))) {
      return res.status(400).json({ error: `Asset types must be an array of: ${VALID_ASSET_TYPES.join(', ')}.` });
    }
  }

  next();
}

module.exports = { validateCrawlRequest };
