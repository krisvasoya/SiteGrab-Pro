// ─────────────────────────────────────────
//  config/cdnWhitelist.js
//  Defines trusted CDN hosts to download and ad/tracker hosts to silently drop.
// ─────────────────────────────────────────

/**
 * External domains whose CSS, JS, and font assets will be fetched and
 * bundled locally in the ZIP.  Keep this list narrow — only well-known
 * public CDNs that serve structural/styling assets.
 */
const ALLOWED_CDN_HOSTS = [
  // Google infrastructure
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'ajax.googleapis.com',

  // Popular JS/CSS CDNs
  'cdnjs.cloudflare.com',
  'cdn.jsdelivr.net',
  'unpkg.com',
  'stackpath.bootstrapcdn.com',
  'maxcdn.bootstrapcdn.com',
  'netdna.bootstrapcdn.com',

  // Font services
  'use.typekit.net',
  'use.fontawesome.com',
  'kit.fontawesome.com',
  'pro.fontawesome.com',

  // Misc trusted asset hosts
  'code.jquery.com',
  'cdn.polyfill.io',
  'polyfill.io',
  'assets.codepen.io',
];

/**
 * File extensions that qualify as "critical structural assets" when served
 * from a CDN host.  Binary media from external CDNs is intentionally excluded
 * to avoid bloating the archive with third-party images/video.
 */
const CDN_CRITICAL_EXTENSIONS = new Set([
  '.css',
  '.js',
  '.mjs',
  '.woff',
  '.woff2',
  '.ttf',
  '.otf',
  '.eot',
  '.svg',  // icon fonts / inline graphics
]);

/**
 * Analytics, ad-tech, and tracking domains whose assets are silently dropped.
 * Requests to these hosts are never included in the downloaded asset pool.
 */
const BLOCKED_TRACKER_HOSTS = [
  // Google analytics / ads
  'google-analytics.com',
  'www.google-analytics.com',
  'analytics.google.com',
  'googletagmanager.com',
  'www.googletagmanager.com',
  'googletagservices.com',
  'doubleclick.net',
  'stats.g.doubleclick.net',

  // Meta / Facebook
  'connect.facebook.net',
  'facebook.net',
  'facebook.com',

  // Hotjar
  'static.hotjar.com',
  'hotjar.com',
  'script.hotjar.com',

  // Segment / analytics platforms
  'cdn.segment.com',
  'segment.com',
  'api.segment.io',

  // Intercom
  'widget.intercom.io',
  'js.intercom.io',
  'intercom.io',

  // Mixpanel
  'cdn.mxpnl.com',
  'mixpanel.com',

  // Amplitude
  'cdn.amplitude.com',
  'amplitude.com',

  // Heap
  'cdn.heapanalytics.com',
  'heapanalytics.com',

  // Fullstory / LogRocket
  'edge.fullstory.com',
  'fullstory.com',
  'cdn.logrocket.io',
  'logrocket.io',

  // Twitter ad pixels
  'static.ads-twitter.com',
  'ads-twitter.com',

  // LinkedIn insight
  'snap.licdn.com',

  // Clarity
  'www.clarity.ms',
  'clarity.ms',
];

// Fast O(1) lookup sets
const CDN_HOST_SET     = new Set(ALLOWED_CDN_HOSTS);
const TRACKER_HOST_SET = new Set(BLOCKED_TRACKER_HOSTS);

/**
 * Returns true if the hostname is a known trusted CDN.
 * @param {string} hostname
 */
function isCdnHost(hostname) {
  return CDN_HOST_SET.has(hostname.toLowerCase());
}

/**
 * Returns true if the hostname is a known tracker / ad-tech domain.
 * @param {string} hostname
 */
function isTrackerHost(hostname) {
  return TRACKER_HOST_SET.has(hostname.toLowerCase());
}

/**
 * Returns true if the file extension qualifies as a critical structural CDN asset
 * (CSS, JS, fonts) that should be bundled locally.
 * @param {string} pathname  URL pathname, e.g. "/css/main.css"
 */
function isCriticalCdnExtension(pathname) {
  const dotIdx = pathname.lastIndexOf('.');
  if (dotIdx === -1) return false;
  const ext = pathname.slice(dotIdx).toLowerCase().split('?')[0];
  return CDN_CRITICAL_EXTENSIONS.has(ext);
}

module.exports = {
  ALLOWED_CDN_HOSTS,
  BLOCKED_TRACKER_HOSTS,
  CDN_CRITICAL_EXTENSIONS,
  isCdnHost,
  isTrackerHost,
  isCriticalCdnExtension,
};
