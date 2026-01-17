/**
 * WebFetch Tool
 *
 * Fetches content from URLs with rate limiting, caching, and robots.txt compliance.
 * Uses native Node.js fetch API (Node 20+).
 */

import type { ToolDefinition, WebFetchOptions, WebFetchResult } from "./types.js";

/**
 * Default timeout for fetch operations (30 seconds).
 */
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Maximum response size in bytes (10 MB).
 */
const DEFAULT_MAX_RESPONSE_SIZE = 10 * 1024 * 1024;

/**
 * Maximum content size to return in result (100 KB for text).
 * Binary content is not returned inline.
 */
const MAX_CONTENT_SIZE = 100 * 1024;

/**
 * User agent string for requests.
 */
const USER_AGENT = "ClaudeCowork/1.0 (https://github.com/anthropic-ai/claude-cowork)";

/**
 * Cache for robots.txt content. Maps domain to parsed disallow rules.
 */
const robotsCache = new Map<string, { rules: string[]; cachedAt: number }>();

/**
 * Cache TTL for robots.txt (1 hour).
 */
const ROBOTS_CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Simple rate limiter tracking last request time per domain.
 */
const rateLimitTracker = new Map<string, number>();

/**
 * Minimum delay between requests to the same domain (1 second).
 */
const MIN_REQUEST_DELAY_MS = 1000;

/**
 * Response cache for recently fetched URLs.
 */
const responseCache = new Map<string, { result: WebFetchResult; cachedAt: number }>();

/**
 * Response cache TTL (5 minutes).
 */
const RESPONSE_CACHE_TTL_MS = 5 * 60 * 1000;

/**
 * Validates that a URL is HTTP or HTTPS.
 */
function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Extracts the domain from a URL for rate limiting and robots.txt.
 */
function getDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname;
  } catch {
    return "";
  }
}

/**
 * Waits for rate limit if needed for a domain.
 */
async function waitForRateLimit(domain: string): Promise<void> {
  const lastRequest = rateLimitTracker.get(domain);
  if (lastRequest) {
    const elapsed = Date.now() - lastRequest;
    if (elapsed < MIN_REQUEST_DELAY_MS) {
      await new Promise((resolve) => setTimeout(resolve, MIN_REQUEST_DELAY_MS - elapsed));
    }
  }
  rateLimitTracker.set(domain, Date.now());
}

/**
 * Fetches and parses robots.txt for a domain.
 * Returns array of disallowed path patterns.
 */
async function fetchRobotsTxt(domain: string, timeout: number): Promise<string[]> {
  // Check cache first
  const cached = robotsCache.get(domain);
  if (cached && Date.now() - cached.cachedAt < ROBOTS_CACHE_TTL_MS) {
    return cached.rules;
  }

  const robotsUrl = `https://${domain}/robots.txt`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(robotsUrl, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      // No robots.txt or error - allow all
      robotsCache.set(domain, { rules: [], cachedAt: Date.now() });
      return [];
    }

    const text = await response.text();
    const rules = parseRobotsTxt(text);
    robotsCache.set(domain, { rules, cachedAt: Date.now() });
    return rules;
  } catch {
    // Error fetching robots.txt - allow all
    clearTimeout(timeoutId);
    robotsCache.set(domain, { rules: [], cachedAt: Date.now() });
    return [];
  }
}

/**
 * Parses robots.txt content to extract Disallow rules for all agents.
 */
function parseRobotsTxt(content: string): string[] {
  const rules: string[] = [];
  const lines = content.split("\n");
  let isRelevantAgent = false;

  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();

    // Check for User-agent directive
    if (trimmed.startsWith("user-agent:")) {
      const agent = trimmed.substring(11).trim();
      isRelevantAgent = agent === "*" || agent.includes("claude");
    }

    // Collect Disallow rules for relevant agents
    if (isRelevantAgent && trimmed.startsWith("disallow:")) {
      const path = line.trim().substring(9).trim();
      if (path) {
        rules.push(path);
      }
    }
  }

  return rules;
}

/**
 * Checks if a path is allowed by robots.txt rules.
 */
function isPathAllowed(path: string, disallowRules: string[]): boolean {
  for (const rule of disallowRules) {
    // Simple prefix matching (robots.txt basic compliance)
    if (path.startsWith(rule)) {
      return false;
    }
    // Handle wildcard at end
    if (rule.endsWith("*")) {
      const prefix = rule.slice(0, -1);
      if (path.startsWith(prefix)) {
        return false;
      }
    }
  }
  return true;
}

/**
 * Determines if content type indicates text content.
 */
function isTextContent(contentType: string | null): boolean {
  if (!contentType) {
    return false;
  }
  const lowerType = contentType.toLowerCase();
  return (
    lowerType.includes("text/") ||
    lowerType.includes("application/json") ||
    lowerType.includes("application/xml") ||
    lowerType.includes("application/javascript") ||
    lowerType.includes("+xml") ||
    lowerType.includes("+json")
  );
}

/**
 * Cleans up expired cache entries.
 */
function cleanupCaches(): void {
  const now = Date.now();

  // Clean robots cache
  for (const [domain, entry] of robotsCache.entries()) {
    if (now - entry.cachedAt > ROBOTS_CACHE_TTL_MS) {
      robotsCache.delete(domain);
    }
  }

  // Clean response cache
  for (const [url, entry] of responseCache.entries()) {
    if (now - entry.cachedAt > RESPONSE_CACHE_TTL_MS) {
      responseCache.delete(url);
    }
  }
}

/**
 * Fetches content from a URL with robots.txt compliance and rate limiting.
 *
 * @param options - Fetch options
 * @returns Fetch result with content and metadata
 *
 * @example
 * ```typescript
 * const result = await webFetch({
 *   url: "https://example.com/page.html",
 *   timeout: 10000
 * });
 *
 * if (result.success) {
 *   console.log(result.content);
 * }
 * ```
 */
export async function webFetch(options: WebFetchOptions): Promise<WebFetchResult> {
  const {
    url,
    timeout = DEFAULT_TIMEOUT_MS,
    headers = {},
    followRedirects = true,
    maxResponseSize = DEFAULT_MAX_RESPONSE_SIZE,
  } = options;

  // Clean up caches periodically
  cleanupCaches();

  // Validate URL
  if (!isValidUrl(url)) {
    return {
      success: false,
      url,
      error: "Invalid URL: must be HTTP or HTTPS",
    };
  }

  // Check response cache
  const cachedResponse = responseCache.get(url);
  if (cachedResponse && Date.now() - cachedResponse.cachedAt < RESPONSE_CACHE_TTL_MS) {
    return cachedResponse.result;
  }

  const domain = getDomain(url);
  const parsed = new URL(url);

  // Check robots.txt compliance
  const disallowRules = await fetchRobotsTxt(domain, Math.min(timeout, 5000));
  if (!isPathAllowed(parsed.pathname, disallowRules)) {
    return {
      success: false,
      url,
      error: `Access denied by robots.txt: ${parsed.pathname}`,
    };
  }

  // Apply rate limiting
  await waitForRateLimit(domain);

  // Set up request with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: followRedirects ? "follow" : "manual",
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        ...headers,
      },
    });

    clearTimeout(timeoutId);

    const contentType = response.headers.get("content-type");
    const contentLengthHeader = response.headers.get("content-length");
    const contentLength = contentLengthHeader ? parseInt(contentLengthHeader, 10) : undefined;

    // Check response size limit
    if (contentLength && contentLength > maxResponseSize) {
      return {
        success: false,
        url: response.url,
        statusCode: response.status,
        statusText: response.statusText,
        contentType: contentType || undefined,
        contentLength,
        error: `Response too large: ${contentLength} bytes exceeds ${maxResponseSize} byte limit`,
      };
    }

    // Handle non-success status codes
    if (!response.ok) {
      return {
        success: false,
        url: response.url,
        statusCode: response.status,
        statusText: response.statusText,
        contentType: contentType || undefined,
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }

    // Read response body
    let content: string | undefined;
    let truncated = false;
    let actualContentLength: number;

    if (isTextContent(contentType)) {
      const text = await response.text();
      actualContentLength = Buffer.byteLength(text, "utf8");

      if (text.length > MAX_CONTENT_SIZE) {
        content = text.substring(0, MAX_CONTENT_SIZE);
        truncated = true;
      } else {
        content = text;
      }
    } else {
      // For binary content, just report metadata
      const buffer = await response.arrayBuffer();
      actualContentLength = buffer.byteLength;
      content = `[Binary content: ${actualContentLength} bytes, type: ${contentType || "unknown"}]`;
    }

    const result: WebFetchResult = {
      success: true,
      url: response.url,
      statusCode: response.status,
      statusText: response.statusText,
      content,
      contentType: contentType || undefined,
      contentLength: actualContentLength,
      truncated,
    };

    // Cache the result
    responseCache.set(url, { result, cachedAt: Date.now() });

    return result;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      // Check for abort (timeout)
      if (error.name === "AbortError") {
        return {
          success: false,
          url,
          timedOut: true,
          error: `Request timed out after ${timeout}ms`,
        };
      }

      // Check for SSL/TLS errors
      if (
        error.message.includes("certificate") ||
        error.message.includes("SSL") ||
        error.message.includes("TLS")
      ) {
        return {
          success: false,
          url,
          error: `SSL/TLS error: ${error.message}`,
        };
      }

      // Network errors
      if (
        error.message.includes("ECONNREFUSED") ||
        error.message.includes("ENOTFOUND") ||
        error.message.includes("getaddrinfo")
      ) {
        return {
          success: false,
          url,
          error: `Network error: ${error.message}`,
        };
      }

      return {
        success: false,
        url,
        error: `Fetch failed: ${error.message}`,
      };
    }

    return {
      success: false,
      url,
      error: "Unknown error occurred",
    };
  }
}

/**
 * Clears all caches. Useful for testing.
 */
export function clearWebFetchCaches(): void {
  robotsCache.clear();
  responseCache.clear();
  rateLimitTracker.clear();
}

/**
 * Tool definition for the WebFetch tool.
 */
export const webFetchToolDefinition: ToolDefinition = {
  name: "web_fetch",
  description: `Fetch content from a URL. Retrieves web pages, JSON APIs, and other HTTP/HTTPS resources.

Features:
- Respects robots.txt disallow rules
- Rate limiting (1 request per second per domain)
- Response caching (5 minutes)
- SSL certificate validation
- Automatic redirect following
- Timeout protection (default 30 seconds)

Limitations:
- Maximum response size: 10 MB
- Text content truncated at 100 KB
- Binary content returns metadata only

Use this for:
- Fetching web page content
- Accessing REST APIs
- Downloading text files
- Reading documentation pages`,
  input_schema: {
    type: "object",
    properties: {
      url: {
        type: "string",
        description: "URL to fetch (must be HTTP or HTTPS)",
      },
      timeout: {
        type: "number",
        description: "Timeout in milliseconds (default: 30000)",
      },
      followRedirects: {
        type: "boolean",
        description: "Whether to follow HTTP redirects (default: true)",
      },
    },
    required: ["url"],
  },
};

/**
 * Creates a WebFetch tool handler function.
 *
 * @returns Handler function for WebFetch tool calls
 */
export function createWebFetchHandler(): (
  input: WebFetchOptions
) => Promise<WebFetchResult> {
  return (input: WebFetchOptions) => webFetch(input);
}
