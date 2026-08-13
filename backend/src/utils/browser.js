// backend/src/utils/browser.js
// Puppeteer browser instance manager. Safe to delete.

const puppeteer = require('puppeteer');

let browserInstance = null;

async function initBrowser() {
  if (browserInstance) return browserInstance;

  console.log('🚀 Launching Puppeteer browser instance...');
  browserInstance = await puppeteer.launch({
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1920,1080',
    ],
  });

  browserInstance.on('disconnected', () => {
    console.log('⚠️ Puppeteer browser disconnected.');
    browserInstance = null;
  });

  console.log('✅ Puppeteer browser ready.');
  return browserInstance;
}

/**
 * Creates a stealth page that bypasses navigator.webdriver detection and Cloudflare / WAF challenges.
 */
async function createStealthPage(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
  );
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
  });
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  return page;
}

function getBrowser() {
  if (!browserInstance) {
    throw new Error('Puppeteer browser is not initialized. Please call initBrowser() first.');
  }
  return browserInstance;
}

async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

module.exports = { initBrowser, getBrowser, closeBrowser, createStealthPage };

