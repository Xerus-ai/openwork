/**
 * WebSearch Tool
 *
 * Performs web searches with configurable search providers.
 * Supports rate limiting, result parsing, and error handling.
 */

import type {
  SearchResult,
  ToolDefinition,
  WebSearchOptions,
  WebSearchResult,
} from "./types.js";

/**
 * Default timeout for search operations (30 seconds).
 */
const DEFAULT_TIMEOUT_MS = 30000;

/**
 * Default maximum number of results to return.
 */
const DEFAULT_MAX_RESULTS = 10;

/**
 * Maximum allowed results to request.
 */
const MAX_RESULTS_LIMIT = 20;

/**
 * User agent string for requests.
 */
const USER_AGENT = "ClaudeCowork/1.0 (https://github.com/anthropic-ai/claude-cowork)";

/**
 * Rate limit tracking for search API.
 */
let lastSearchTime = 0;

/**
 * Minimum delay between searches (2 seconds).
 */
const MIN_SEARCH_DELAY_MS = 2000;

/**
 * Search cache for recent queries.
 */
const searchCache = new Map<string, { result: WebSearchResult; cachedAt: number }>();

/**
 * Search cache TTL (10 minutes).
 */
const SEARCH_CACHE_TTL_MS = 10 * 60 * 1000;

/**
 * Search provider configuration.
 */
interface SearchProviderConfig {
  /** API base URL */
  baseUrl: string;
  /** API key (if required) */
  apiKey?: string;
  /** Name of the provider */
  name: string;
}

/**
 * Current search provider configuration.
 * Can be set via setSearchProvider().
 */
let searchProvider: SearchProviderConfig | null = null;

/**
 * Waits for rate limit if needed.
 */
async function waitForRateLimit(): Promise<void> {
  const elapsed = Date.now() - lastSearchTime;
  if (elapsed < MIN_SEARCH_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, MIN_SEARCH_DELAY_MS - elapsed));
  }
  lastSearchTime = Date.now();
}

/**
 * Cleans up expired cache entries.
 */
function cleanupCache(): void {
  const now = Date.now();
  for (const [query, entry] of searchCache.entries()) {
    if (now - entry.cachedAt > SEARCH_CACHE_TTL_MS) {
      searchCache.delete(query);
    }
  }
}

/**
 * Creates a cache key from search options.
 */
function createCacheKey(query: string, maxResults: number): string {
  return `${query}:${maxResults}`;
}

/**
 * Validates a search query.
 */
function validateQuery(query: string): string | undefined {
  if (!query || typeof query !== "string") {
    return "Search query is required";
  }
  if (query.trim().length === 0) {
    return "Search query cannot be empty";
  }
  if (query.length > 500) {
    return "Search query too long (max 500 characters)";
  }
  return undefined;
}

/**
 * Performs search using configured provider.
 * If no provider is configured, returns a helpful message.
 */
async function performSearch(
  query: string,
  maxResults: number,
  timeout: number
): Promise<WebSearchResult> {
  if (!searchProvider) {
    // No provider configured - return informative result
    return {
      success: false,
      query,
      error:
        "No search provider configured. Set up a search provider using setSearchProvider() with API credentials.",
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    // Build search URL based on provider
    const searchUrl = buildSearchUrl(searchProvider, query, maxResults);

    const response = await fetch(searchUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/json",
        ...(searchProvider.apiKey && {
          Authorization: `Bearer ${searchProvider.apiKey}`,
        }),
      },
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      return {
        success: false,
        query,
        error: `Search API error: HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    const results = parseSearchResults(searchProvider.name, data, maxResults);

    return {
      success: true,
      query,
      results,
      resultCount: results.length,
    };
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return {
          success: false,
          query,
          timedOut: true,
          error: `Search timed out after ${timeout}ms`,
        };
      }
      return {
        success: false,
        query,
        error: `Search failed: ${error.message}`,
      };
    }

    return {
      success: false,
      query,
      error: "Unknown error during search",
    };
  }
}

/**
 * Builds search URL based on provider configuration.
 */
function buildSearchUrl(
  provider: SearchProviderConfig,
  query: string,
  maxResults: number
): string {
  const encodedQuery = encodeURIComponent(query);

  // Provider-specific URL building
  switch (provider.name) {
    case "brave":
      return `${provider.baseUrl}/web/search?q=${encodedQuery}&count=${maxResults}`;
    case "serper":
      return `${provider.baseUrl}/search?q=${encodedQuery}&num=${maxResults}`;
    case "duckduckgo":
      return `${provider.baseUrl}/?q=${encodedQuery}&format=json`;
    default:
      // Generic search API format
      return `${provider.baseUrl}/search?q=${encodedQuery}&limit=${maxResults}`;
  }
}

/**
 * Parses search results based on provider response format.
 */
function parseSearchResults(
  providerName: string,
  data: unknown,
  maxResults: number
): SearchResult[] {
  const results: SearchResult[] = [];

  if (!data || typeof data !== "object") {
    return results;
  }

  const dataObj = data as Record<string, unknown>;

  // Provider-specific parsing
  switch (providerName) {
    case "brave": {
      const webResults = (dataObj.web as { results?: unknown[] })?.results;
      if (Array.isArray(webResults)) {
        for (const item of webResults.slice(0, maxResults)) {
          const result = item as Record<string, unknown>;
          if (result.title && result.url) {
            results.push({
              title: String(result.title),
              url: String(result.url),
              snippet: String(result.description || ""),
            });
          }
        }
      }
      break;
    }

    case "serper": {
      const organicResults = dataObj.organic;
      if (Array.isArray(organicResults)) {
        for (const item of organicResults.slice(0, maxResults)) {
          const result = item as Record<string, unknown>;
          if (result.title && result.link) {
            results.push({
              title: String(result.title),
              url: String(result.link),
              snippet: String(result.snippet || ""),
            });
          }
        }
      }
      break;
    }

    case "duckduckgo": {
      const ddgResults = dataObj.RelatedTopics;
      if (Array.isArray(ddgResults)) {
        for (const item of ddgResults.slice(0, maxResults)) {
          const result = item as Record<string, unknown>;
          if (result.Text && result.FirstURL) {
            results.push({
              title: String(result.Text).substring(0, 100),
              url: String(result.FirstURL),
              snippet: String(result.Text),
            });
          }
        }
      }
      break;
    }

    default: {
      // Generic result parsing - try common formats
      const possibleResults =
        (dataObj.results as unknown[]) ||
        (dataObj.items as unknown[]) ||
        (dataObj.data as unknown[]);

      if (Array.isArray(possibleResults)) {
        for (const item of possibleResults.slice(0, maxResults)) {
          const result = item as Record<string, unknown>;
          const title = result.title || result.name;
          const url = result.url || result.link || result.href;
          const snippet = result.snippet || result.description || result.abstract || "";

          if (title && url) {
            results.push({
              title: String(title),
              url: String(url),
              snippet: String(snippet),
            });
          }
        }
      }
      break;
    }
  }

  return results;
}

/**
 * Performs a web search with the given query.
 *
 * @param options - Search options
 * @returns Search results
 *
 * @example
 * ```typescript
 * const result = await webSearch({
 *   query: "TypeScript tutorial",
 *   maxResults: 5
 * });
 *
 * if (result.success) {
 *   for (const item of result.results) {
 *     console.log(item.title, item.url);
 *   }
 * }
 * ```
 */
export async function webSearch(options: WebSearchOptions): Promise<WebSearchResult> {
  const {
    query,
    maxResults = DEFAULT_MAX_RESULTS,
    timeout = DEFAULT_TIMEOUT_MS,
  } = options;

  // Clean up cache periodically
  cleanupCache();

  // Validate query
  const validationError = validateQuery(query);
  if (validationError) {
    return {
      success: false,
      query: query || "",
      error: validationError,
    };
  }

  // Normalize max results
  const normalizedMaxResults = Math.min(Math.max(1, maxResults), MAX_RESULTS_LIMIT);

  // Check cache
  const cacheKey = createCacheKey(query, normalizedMaxResults);
  const cached = searchCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < SEARCH_CACHE_TTL_MS) {
    return cached.result;
  }

  // Apply rate limiting
  await waitForRateLimit();

  // Perform search
  const result = await performSearch(query, normalizedMaxResults, timeout);

  // Cache successful results
  if (result.success) {
    searchCache.set(cacheKey, { result, cachedAt: Date.now() });
  }

  return result;
}

/**
 * Configures the search provider.
 *
 * @param config - Provider configuration
 *
 * @example
 * ```typescript
 * // Configure Brave Search
 * setSearchProvider({
 *   name: "brave",
 *   baseUrl: "https://api.search.brave.com/res/v1",
 *   apiKey: process.env.BRAVE_API_KEY
 * });
 *
 * // Configure Serper (Google Search API)
 * setSearchProvider({
 *   name: "serper",
 *   baseUrl: "https://google.serper.dev",
 *   apiKey: process.env.SERPER_API_KEY
 * });
 * ```
 */
export function setSearchProvider(config: SearchProviderConfig): void {
  searchProvider = config;
}

/**
 * Clears the search provider configuration.
 */
export function clearSearchProvider(): void {
  searchProvider = null;
}

/**
 * Gets the current search provider name.
 */
export function getSearchProviderName(): string | null {
  return searchProvider?.name || null;
}

/**
 * Clears all caches. Useful for testing.
 */
export function clearWebSearchCaches(): void {
  searchCache.clear();
  lastSearchTime = 0;
}

/**
 * Tool definition for the WebSearch tool.
 */
export const webSearchToolDefinition: ToolDefinition = {
  name: "web_search",
  description: `Search the web for information. Returns a list of search results with titles, URLs, and snippets.

Features:
- Rate limiting (minimum 2 seconds between searches)
- Result caching (10 minutes)
- Configurable result count
- Timeout protection

Requirements:
- A search provider must be configured (Brave Search, Serper, or custom)
- API key may be required depending on provider

Use this for:
- Finding documentation and tutorials
- Researching technical topics
- Looking up error messages
- Finding code examples`,
  input_schema: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "Search query (max 500 characters)",
      },
      maxResults: {
        type: "number",
        description: "Maximum results to return (default: 10, max: 20)",
      },
      timeout: {
        type: "number",
        description: "Timeout in milliseconds (default: 30000)",
      },
    },
    required: ["query"],
  },
};

/**
 * Creates a WebSearch tool handler function.
 *
 * @returns Handler function for WebSearch tool calls
 */
export function createWebSearchHandler(): (
  input: WebSearchOptions
) => Promise<WebSearchResult> {
  return (input: WebSearchOptions) => webSearch(input);
}
