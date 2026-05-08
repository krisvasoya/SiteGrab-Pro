// ─────────────────────────────────────────
//  services/assetCollector.js
//  Extracts asset URLs from a parsed HTML page
// ─────────────────────────────────────────
const { URL } = require('url');

const ASSET_SELECTORS = {
  css:    ['link[rel="stylesheet"][href]'],
  js:     ['script[src]'],
  images: ['img[src]', 'img[data-src]', 'source[srcset]', 'link[rel="icon"][href]', 'link[rel="apple-touch-icon"][href]'],
  fonts:  ['link[rel="preload"][as="font"][href]'],
  video:  ['video[src]', 'source[src]'],
  audio:  ['audio[src]', 'source[src]'],
};

const ATTR_MAP = {
  'link[rel="stylesheet"][href]': 'href',
  'script[src]': 'src',
  'img[src]': 'src',
  'img[data-src]': 'data-src',
  'source[srcset]': 'srcset',
  'link[rel="icon"][href]': 'href',
  'link[rel="apple-touch-icon"][href]': 'href',
  'link[rel="preload"][as="font"][href]': 'href',
  'video[src]': 'src',
  'source[src]': 'src',
  'audio[src]': 'src',
};

const ASSET_EXTS = {
  css:    ['.css'],
  js:     ['.js', '.mjs'],
  images: ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico', '.avif'],
  fonts:  ['.woff', '.woff2', '.ttf', '.otf', '.eot'],
  video:  ['.mp4', '.webm', '.ogg'],
  audio:  ['.mp3', '.wav', '.ogg'],
  models: ['.glb', '.gltf', '.obj', '.fbx'],
  shaders:['.glsl', '.vert', '.frag'],
  wasm:   ['.wasm'],
  json:   ['.json'],
};

/**
 * Returns absolute URLs of all assets found in a parsed Cheerio page.
 */
function extractAssetUrls($, pageUrl, enabledTypes, hostname) {
  const urls = new Set();

  const addUrl = (rawHref) => {
    if (!rawHref || rawHref.startsWith('data:') || rawHref.startsWith('blob:')) return;
    try {
      const abs = new URL(rawHref.trim(), pageUrl).href;
      const assetHostname = new URL(abs).hostname.replace(/^www\./, '');
      const baseHostname  = hostname.replace(/^www\./, '');
      
      // Allow if same base domain (e.g. www.gcet.ac.in and gcet.ac.in)
      if (assetHostname === baseHostname) {
        urls.add(abs);
      }
    } catch { /* ignore */ }
  };

  // DOM-based extraction
  for (const type of enabledTypes) {
    const selectors = ASSET_SELECTORS[type] || [];
    for (const sel of selectors) {
      const attr = ATTR_MAP[sel];
      $(sel).each((_, el) => {
        const val = $(el).attr(attr);
        if (!val) return;
        // Handle srcset="url 1x, url 2x" format
        if (attr === 'srcset') {
          val.split(',').forEach((part) => addUrl(part.trim().split(/\s+/)[0]));
        } else {
          addUrl(val);
        }
      });
    }
  }

  // CSS background-image extraction from inline <style> tags
  $('style').each((_, el) => {
    const css = $(el).html() || '';
    const bgMatches = css.matchAll(/url\(['"]?([^'")\s]+)['"]?\)/g);
    for (const m of bgMatches) addUrl(m[1]);
    const fontMatches = css.matchAll(/@font-face[\s\S]*?src:\s*url\(['"]?([^'")\s]+)['"]?\)/g);
    for (const m of fontMatches) addUrl(m[1]);
  });

  // 3D model paths — regex parse JS for common loaders
  if (enabledTypes.includes('models') || enabledTypes.includes('js')) {
    $('script').each((_, el) => {
      const code = $(el).html() || '';
      // THREE.GLTFLoader / OBJLoader load('path') calls
      const loaderMatches = code.matchAll(/\.load\s*\(\s*['"`]([^'"`\s]+\.(?:glb|gltf|obj|fbx|hdr|exr|ktx))['"`]/gi);
      for (const m of loaderMatches) addUrl(m[1]);
    });
  }

  return [...urls];
}

module.exports = { extractAssetUrls, ASSET_EXTS };
