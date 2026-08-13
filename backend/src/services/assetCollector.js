// ─────────────────────────────────────────
//  services/assetCollector.js
//  Extracts ALL asset URLs — same domain, subdomains, CDNs, and media hosts
// ─────────────────────────────────────────
const { URL } = require('url');
const path = require('path');
const { isCdnHost, isTrackerHost, isCriticalCdnExtension } = require('../config/cdnWhitelist');

const STATIC_EXTENSIONS = new Set([
  '.css', '.js', '.mjs', '.cjs',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg', '.ico', '.bmp', '.tiff',
  '.woff', '.woff2', '.ttf', '.otf', '.eot',
  '.mp4', '.webm', '.ogg', '.mp3', '.wav',
  '.pdf', '.glb', '.gltf', '.hdr', '.obj', '.fbx', '.json'
]);

function hasStaticExtension(pathname) {
  if (!pathname) return false;
  const cleanPath = pathname.split('?')[0].split('#')[0];
  const ext = path.extname(cleanPath).toLowerCase();
  return STATIC_EXTENSIONS.has(ext);
}

function getApexDomain(hostname) {
  if (!hostname) return '';
  const parts = hostname.toLowerCase().split('.');
  if (parts.length <= 2) return hostname.toLowerCase();
  // Common 2-part TLDs (co.uk, ac.in, com.au, etc.)
  if (['ac', 'co', 'gov', 'edu', 'com', 'org', 'net'].includes(parts[parts.length - 2])) {
    return parts.slice(-3).join('.');
  }
  return parts.slice(-2).join('.');
}

/**
 * Returns absolute URLs of all assets found in the page.
 */
function extractAssetUrls($, pageUrl, enabledTypes = ['html', 'css', 'js', 'images', 'fonts']) {
  const urls = new Set();
  const pageOriginHostname = (() => { try { return new URL(pageUrl).hostname.toLowerCase(); } catch { return ''; } })();
  const pageApex = getApexDomain(pageOriginHostname);

  const addUrl = (rawHref) => {
    if (!rawHref || typeof rawHref !== 'string') return;
    rawHref = rawHref.trim();
    if (
      rawHref.startsWith('data:') ||
      rawHref.startsWith('blob:') ||
      rawHref.startsWith('javascript:') ||
      rawHref.startsWith('mailto:') ||
      rawHref.startsWith('tel:') ||
      rawHref === '#' ||
      rawHref === ''
    ) return;

    try {
      const abs = new URL(rawHref, pageUrl).href;
      if (!abs.startsWith('http://') && !abs.startsWith('https://')) return;

      const parsed   = new URL(abs);
      const hostname = parsed.hostname.toLowerCase();

      // Silent drop for tracking & telemetry hosts
      if (isTrackerHost(hostname)) return;

      const hostApex = getApexDomain(hostname);
      const isSameOrigin = hostname === pageOriginHostname ||
        hostApex === pageApex ||
        hostname.endsWith('.' + pageOriginHostname) ||
        pageOriginHostname.endsWith('.' + hostname);

      // Collect same-origin assets, trusted CDN assets, or any media/static files
      if (isSameOrigin || isCdnHost(hostname) || isCriticalCdnExtension(parsed.pathname) || hasStaticExtension(parsed.pathname)) {
        urls.add(abs);
      }
    } catch { /* ignore malformed URLs */ }
  };

  // ── Universal element attribute scanning ──
  $('link[href]').each((_, el) => {
    const rel = ($(el).attr('rel') || '').toLowerCase();
    const href = $(el).attr('href');
    if (rel.includes('stylesheet') || rel.includes('icon') || rel.includes('preload') || rel.includes('font') || hasStaticExtension(href)) {
      addUrl(href);
    }
  });

  $('script[src]').each((_, el) => {
    addUrl($(el).attr('src'));
  });

  if (enabledTypes.includes('images') || enabledTypes.includes('html')) {
    $('img').each((_, el) => {
      addUrl($(el).attr('src'));
      addUrl($(el).attr('data-src'));
      addUrl($(el).attr('data-lazy-src'));
      addUrl($(el).attr('data-original'));
      addUrl($(el).attr('data-actualsrc'));
      addUrl($(el).attr('data-url'));
      
      const srcset = $(el).attr('srcset') || $(el).attr('data-srcset');
      if (srcset) {
        srcset.split(',').forEach((part) => {
          const u = part.trim().split(/\s+/)[0];
          if (u) addUrl(u);
        });
      }
    });

    $('source').each((_, el) => {
      addUrl($(el).attr('src'));
      const srcset = $(el).attr('srcset');
      if (srcset) {
        srcset.split(',').forEach((part) => {
          const u = part.trim().split(/\s+/)[0];
          if (u) addUrl(u);
        });
      }
    });

    $('meta[property="og:image"], meta[name="twitter:image"], meta[property="og:logo"]').each((_, el) => {
      addUrl($(el).attr('content'));
    });

    $('svg image').each((_, el) => {
      addUrl($(el).attr('href') || $(el).attr('xlink:href'));
    });
  }

  if (enabledTypes.includes('video') || enabledTypes.includes('audio') || enabledTypes.includes('html')) {
    $('video, audio, embed, object').each((_, el) => {
      addUrl($(el).attr('src'));
      addUrl($(el).attr('data'));
    });
  }

  // ── CSS url() and @import in <style> blocks ──
  $('style').each((_, el) => {
    const css = $(el).html() || '';
    for (const m of css.matchAll(/url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g)) {
      addUrl(m[1]);
    }
    for (const m of css.matchAll(/@import\s+(?:url\(\s*)?['"]([^'"]+)['"]\s*\)?/g)) {
      addUrl(m[1]);
    }
  });

  // ── Inline style attributes ───────────
  $('[style]').each((_, el) => {
    const style = $(el).attr('style') || '';
    for (const m of style.matchAll(/url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g)) {
      addUrl(m[1]);
    }
  });

  // ── data-src / data-background (lazy load) ──
  $('[data-src],[data-background],[data-bg],[data-image]').each((_, el) => {
    addUrl($(el).attr('data-src'));
    addUrl($(el).attr('data-background'));
    addUrl($(el).attr('data-bg'));
    addUrl($(el).attr('data-image'));
  });

  return [...urls];
}

module.exports = { extractAssetUrls, hasStaticExtension, getApexDomain };

