// backend/src/config/featureFlags.js
// Central controls for advanced features. Set to false to instantly revert to classic mode.

module.exports = {
  ENABLE_AI_PLANNER: true,        // Profiles homepages for complexity, architecture & rate limits
  ENABLE_INTEGRITY_CHECKS: true,   // Performs magic bytes validation and soft-404 detection
  ENABLE_POST_CRAWL_REPORT: true,  // Compiles overall crawl success/failure metrics
  ENABLE_DEEP_CRAWL: true,         // Allows dynamic client-side SPA crawls using browser evaluation
};
