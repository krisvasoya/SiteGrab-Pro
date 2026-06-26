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
    ],
  });

  browserInstance.on('disconnected', () => {
    console.log('⚠️ Puppeteer browser disconnected.');
    browserInstance = null;
  });

  console.log('✅ Puppeteer browser ready.');
  return browserInstance;
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

module.exports = { initBrowser, getBrowser, closeBrowser };
