// ─────────────────────────────────────────
//  utils/robotsParser.js
// ─────────────────────────────────────────
const { URL } = require('url');

/**
 * Parse robots.txt text into a rules object.
 * Returns { disallowed: string[], allowed: string[] } for *
 */
function parseRobotsTxt(text) {
  const lines = text.split('\n').map((l) => l.trim());
  const rules  = { disallowed: [], allowed: [] };
  let inStar   = false;

  for (const line of lines) {
    if (line.toLowerCase().startsWith('user-agent:')) {
      const agent = line.split(':')[1].trim();
      inStar = agent === '*';
      continue;
    }
    if (!inStar) continue;

    if (line.toLowerCase().startsWith('disallow:')) {
      const path = line.split(':')[1]?.trim();
      if (path) rules.disallowed.push(path);
    }
    if (line.toLowerCase().startsWith('allow:')) {
      const path = line.split(':')[1]?.trim();
      if (path) rules.allowed.push(path);
    }
  }

  return rules;
}

/**
 * Returns true if the URL is allowed to be crawled.
 */
function isAllowed(rules, rawUrl) {
  try {
    const pathname = new URL(rawUrl).pathname;

    // Allow rules override disallow rules
    for (const allow of rules.allowed) {
      if (pathname.startsWith(allow)) return true;
    }

    for (const disallow of rules.disallowed) {
      if (disallow && pathname.startsWith(disallow)) return false;
    }

    return true;
  } catch {
    return true;
  }
}

module.exports = { parseRobotsTxt, isAllowed };
