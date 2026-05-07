// ─────────────────────────────────────────
//  utils/urlUtils.js
// ─────────────────────────────────────────
const { URL } = require('url');

const PRIVATE_RANGES = [
  /^localhost$/i,
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^::1$/,
  /^0\.0\.0\.0$/,
  /^169\.254\./,  // link-local
  /^fd[0-9a-f]{2}:/i, // IPv6 ULA
];

/**
 * Normalises a URL — adds https:// if missing, strips trailing slash.
 */
function normalizeUrl(raw) {
  let url = raw.trim();
  if (!/^https?:\/\//i.test(url)) url = 'https://' + url;
  const parsed = new URL(url);
  // Lowercase hostname
  parsed.hostname = parsed.hostname.toLowerCase();
  return parsed.href.replace(/\/$/, '');
}

/**
 * Returns false if the URL resolves to a private/localhost address.
 * Basic SSRF prevention — does NOT perform a DNS lookup (that would require async).
 */
function isSafeDomain(rawUrl) {
  try {
    const { hostname } = new URL(rawUrl);
    return !PRIVATE_RANGES.some((re) => re.test(hostname));
  } catch {
    return false;
  }
}

module.exports = { normalizeUrl, isSafeDomain };
