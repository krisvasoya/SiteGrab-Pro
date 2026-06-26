// frontend/src/config/featureFlags.js
// Central UI controls for advanced features. Set to false to instantly collapse back to original UI.

export const FEATURE_FLAGS = {
  enableAIPlanner: true,          // Shows "AI Pre-Crawl Scan" button and dynamic timeline dashboard
  enableIntegrityReport: true,    // Shows success circular diagram and failed asset dropdown panel
  enableDeepCrawl: true,          // Shows "Deep Crawl" mode toggle in advanced settings
};
