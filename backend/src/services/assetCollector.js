// ─────────────────────────────────────────
//  services/assetCollector.js
//  Extracts ALL asset URLs — same domain AND external CDNs
// ─────────────────────────────────────────
const { URL } = require('url');

const ASSET_SELECTORS = {
  css:    ['link[rel="stylesheet"][href]'],
  js:     ['script[src]'],
  images: [
    'img[src]', 'img[data-src]', 'img[data-lazy-src]',
    'source[srcset]', 'source[src]',
    'link[rel="icon"][href]',
    'link[rel="apple-touch-icon"][href]',
    'meta[property="og:image"][content]',
  ],
  fonts:  [
    'link[rel="preload"][as="font"][href]',
    'link[rel="stylesheet"][href*="fonts"]',
  ],
  video:  ['video[src]', 'video source[src]'],
  audio:  ['audio[src]', 'audio source[src]'],
};

const ATTR_MAP = {
  'link[rel="stylesheet"][href]':              'href',
  'link[rel="stylesheet"][href*="fonts"]':     'href',
  'script[src]':                               'src',
  'img[src]':                                  'src',
  'img[data-src]':                             'data-src',
  'img[data-lazy-src]':                        'data-lazy-src',
  'source[srcset]':                            'srcset',
  'source[src]':                               'src',
  'link[rel="icon"][href]':                    'href',
  'link[rel="apple-touch-icon"][href]':        'href',
  'meta[property="og:image"][content]':        'content',
  'link[rel="preload"][as="font"][href]':       'href',
  'video[src]':                                'src',
  'video source[src]':                         'src',
  'audio[src]':                                'src',
  'audio source[src]':                         'src',
};

/**
 * Returns absolute URLs of all assets found in the page.
 * Collects assets from ANY domain — not just same hostname.
 * This is critical for sites that load assets from CDNs or subdomains.
 */
function extractAssetUrls($, pageUrl, enabledTypes, hostname) {
  const urls = new Set();

  const addUrl = (rawHref) => {
    if (!rawHref || typeof rawHref !== 'string') return;
    rawHref = rawHref.trim();
    if (
      rawHref.startsWith('data:') ||
      rawHref.startsWith('blob:') ||
      rawHref.startsWith('javascript:') ||
      rawHref === '#' ||
      rawHref === ''
    ) return;

    try {
      const abs = new URL(rawHref, pageUrl).href;
      // Only allow http/https — skip ftp, mailto etc.
      if (!abs.startsWith('http://') && !abs.startsWith('https://')) return;
      urls.add(abs);
    } catch { /* ignore malformed URLs */ }
  };

  // ── DOM selector extraction ───────────
  for (const type of enabledTypes) {
    const selectors = ASSET_SELECTORS[type] || [];
    for (const sel of selectors) {
      const attr = ATTR_MAP[sel];
      if (!attr) continue;
      $(sel).each((_, el) => {
        const val = $(el).attr(attr);
        if (!val) return;
        // Handle srcset="url 1x, url2 2x" format
        if (attr === 'srcset') {
          val.split(',').forEach((part) => {
            const u = part.trim().split(/\s+/)[0];
            if (u) addUrl(u);
          });
        } else {
          addUrl(val);
        }
      });
    }
  }

  // ── CSS url() in <style> blocks ───────
  $('style').each((_, el) => {
    const css = $(el).html() || '';
    for (const m of css.matchAll(/url\(\s*['"]?([^'")\s]+)['"]?\s*\)/g)) {
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
  $('[data-src],[data-background],[data-bg]').each((_, el) => {
    addUrl($(el).attr('data-src'));
    addUrl($(el).attr('data-background'));
    addUrl($(el).attr('data-bg'));
  });

  // ── <link rel="preload"> any asset ────
  $('link[rel="preload"][href]').each((_, el) => {
    addUrl($(el).attr('href'));
  });

  // ── 3D model paths from inline scripts ─
  if (enabledTypes.includes('models')) {
    $('script:not([src])').each((_, el) => {
      const code = $(el).html() || '';
      for (const m of code.matchAll(
        /\.load\s*\(\s*['"`]([^'"`\s]+\.(?:glb|gltf|obj|fbx|hdr))['"`]/gi
      )) {
        addUrl(m[1]);
      }
    });
  }

  return [...urls];
}

module.exports = { extractAssetUrls };
