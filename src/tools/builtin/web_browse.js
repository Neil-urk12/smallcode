// SmallCode — Web Browse Tool (Playwright + Stealth)
// Full browser automation for web search and page interaction
// Optional: requires `npm install playwright playwright-extra puppeteer-extra-plugin-stealth`
// Falls back to simple fetch if not installed.
//
// Tools exposed:
//   web_search — search the web, return top results
//   web_fetch  — fetch a URL, extract readable text
//   web_browse — full browser: navigate, click, extract (advanced)

let playwright = null;
let stealthPlugin = null;
let browserInstance = null;

// Lazy-load playwright (optional dependency)
function loadPlaywright() {
  if (playwright) return true;
  try {
    playwright = require('playwright-extra');
    stealthPlugin = require('puppeteer-extra-plugin-stealth');
    playwright.chromium.use(stealthPlugin());
    return true;
  } catch {
    return false;
  }
}

async function getBrowser() {
  if (browserInstance) return browserInstance;
  if (!loadPlaywright()) return null;
  browserInstance = await playwright.chromium.launch({ headless: true });
  return browserInstance;
}

async function closeBrowser() {
  if (browserInstance) {
    await browserInstance.close();
    browserInstance = null;
  }
}

// ─── Web Search (DuckDuckGo, no API key) ─────────────────────────────────────

async function webSearch(query, maxResults = 5) {
  // Try Playwright first for better results
  const browser = await getBrowser();
  if (browser) {
    return await _searchWithBrowser(browser, query, maxResults);
  }
  // Fallback: DuckDuckGo HTML lite (no JS needed)
  return await _searchWithFetch(query, maxResults);
}

async function _searchWithBrowser(browser, query, maxResults) {
  const page = await browser.newPage();
  try {
    await page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(query)}&ia=web`, { waitUntil: 'networkidle', timeout: 15000 });
    
    const results = await page.evaluate((max) => {
      const items = document.querySelectorAll('[data-result],.result');
      return Array.from(items).slice(0, max).map(el => {
        const link = el.querySelector('a[href]');
        const snippet = el.querySelector('.result__snippet, .snippet');
        return {
          title: link?.textContent?.trim() || '',
          url: link?.href || '',
          snippet: snippet?.textContent?.trim() || '',
        };
      }).filter(r => r.url && r.title);
    }, maxResults);

    return results;
  } catch (e) {
    return [{ title: 'Search failed', url: '', snippet: e.message }];
  } finally {
    await page.close();
  }
}

async function _searchWithFetch(query, maxResults) {
  // DuckDuckGo HTML lite — works without JS
  try {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SmallCode/0.4.0)' },
    });
    const html = await response.text();
    
    // Parse results from HTML
    const results = [];
    const resultRegex = /<a rel="nofollow" class="result__a" href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    while ((match = resultRegex.exec(html)) && results.length < maxResults) {
      results.push({
        title: match[2].trim(),
        url: match[1],
        snippet: match[3].replace(/<[^>]+>/g, '').trim(),
      });
    }
    return results.length > 0 ? results : [{ title: 'No results', url: '', snippet: `No results for: ${query}` }];
  } catch (e) {
    return [{ title: 'Search failed', url: '', snippet: e.message }];
  }
}

// ─── Web Fetch (extract readable content) ────────────────────────────────────

async function webFetch(url, maxChars = 5000) {
  // Try Playwright for JS-heavy pages
  const browser = await getBrowser();
  if (browser) {
    return await _fetchWithBrowser(browser, url, maxChars);
  }
  // Fallback: simple fetch
  return await _fetchSimple(url, maxChars);
}

async function _fetchWithBrowser(browser, url, maxChars) {
  const page = await browser.newPage();
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // Extract readable text (strip nav, ads, etc.)
    const text = await page.evaluate(() => {
      // Remove noise elements
      const noise = document.querySelectorAll('nav, header, footer, script, style, [role="navigation"], .ad, .sidebar');
      noise.forEach(el => el.remove());
      
      const main = document.querySelector('main, article, [role="main"], .content, #content');
      const target = main || document.body;
      return target.innerText || target.textContent || '';
    });

    return text.slice(0, maxChars).trim();
  } catch (e) {
    return `Failed to fetch ${url}: ${e.message}`;
  } finally {
    await page.close();
  }
}

async function _fetchSimple(url, maxChars) {
  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SmallCode/0.4.0)' },
      timeout: 10000,
    });
    const html = await response.text();
    // Strip HTML tags for readable text
    const text = html.replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.slice(0, maxChars);
  } catch (e) {
    return `Failed to fetch ${url}: ${e.message}`;
  }
}

module.exports = { webSearch, webFetch, closeBrowser, loadPlaywright };
