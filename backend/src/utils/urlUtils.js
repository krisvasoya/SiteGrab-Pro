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

/**
 * Normalises a URL to a plain lookup key:
 *   - Strips protocol (http:// / https://)
 *   - Lowercases hostname
 *   - Removes query string, hash fragment, and trailing slash
 *
 * Used for deduplicating discovered asset URLs and future relinking passes.
 *
 * @param {string} urlStr
 * @returns {string}  e.g.  "example.com/assets/main.js"
 */
function normalizeForLookup(urlStr) {
  try {
    const u = new URL(urlStr);
    let hostname = u.hostname.toLowerCase();
    let pathname = u.pathname.replace(/\/+$/, '').replace(/\/+/g, '/');
    if (pathname === '') pathname = '/';
    return `${hostname}${pathname}`;
  } catch (_e) {
    // Fallback for relative or malformed URLs
    return urlStr
      .replace(/^https?:\/\//i, '')
      .split('?')[0]
      .split('#')[0]
      .replace(/\/+$/, '')
      .toLowerCase();
  }
}

module.exports = { normalizeUrl, isSafeDomain, normalizeForLookup };

