/**
 * Web Tools Tests
 *
 * Tests for WebFetch and WebSearch tools with mocked HTTP responses.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearWebFetchCaches,
  createWebFetchHandler,
  webFetch,
  webFetchToolDefinition,
} from "./web-fetch.js";
import {
  clearSearchProvider,
  clearWebSearchCaches,
  createWebSearchHandler,
  getSearchProviderName,
  setSearchProvider,
  webSearch,
  webSearchToolDefinition,
} from "./web-search.js";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

/**
 * Creates a mock Response object.
 */
function createMockResponse(options: {
  ok?: boolean;
  status?: number;
  statusText?: string;
  headers?: Record<string, string>;
  body?: string;
  json?: unknown;
}): Response {
  const {
    ok = true,
    status = 200,
    statusText = "OK",
    headers = {},
    body = "",
  } = options;

  const headerMap = new Map(Object.entries(headers));

  return {
    ok,
    status,
    statusText,
    url: "https://example.com",
    headers: {
      get: (name: string) => headerMap.get(name.toLowerCase()) || null,
    },
    text: vi.fn().mockResolvedValue(body),
    json: vi.fn().mockResolvedValue(options.json || {}),
    arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(body.length)),
  } as unknown as Response;
}

describe("WebFetch", () => {
  beforeEach(() => {
    clearWebFetchCaches();
    mockFetch.mockReset();
  });

  afterEach(() => {
    clearWebFetchCaches();
  });

  describe("URL validation", () => {
    it("should reject invalid URLs", async () => {
      const result = await webFetch({ url: "not-a-url" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid URL");
    });

    it("should reject non-HTTP(S) URLs", async () => {
      const result = await webFetch({ url: "ftp://example.com/file.txt" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid URL");
    });

    it("should accept HTTP URLs", async () => {
      // First mock is for robots.txt check
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: 404, ok: false })
      );
      // Second mock is for the actual request
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          headers: { "content-type": "text/html" },
          body: "<html></html>",
        })
      );

      const result = await webFetch({ url: "http://example.com" });

      expect(result.success).toBe(true);
    });

    it("should accept HTTPS URLs", async () => {
      // First mock is for robots.txt check
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: 404, ok: false })
      );
      // Second mock is for the actual request
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          headers: { "content-type": "text/html" },
          body: "<html></html>",
        })
      );

      const result = await webFetch({ url: "https://example.com" });

      expect(result.success).toBe(true);
    });
  });

  describe("successful fetches", () => {
    it("should fetch HTML content", async () => {
      const htmlContent = "<html><body>Hello World</body></html>";

      // First call is for robots.txt
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: 404, ok: false })
      );
      // Second call is for the actual URL
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          headers: { "content-type": "text/html" },
          body: htmlContent,
        })
      );

      const result = await webFetch({ url: "https://example.com/page.html" });

      expect(result.success).toBe(true);
      expect(result.content).toBe(htmlContent);
      expect(result.contentType).toBe("text/html");
    });

    it("should fetch JSON content", async () => {
      const jsonContent = '{"key": "value"}';

      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: 404, ok: false })
      );
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          headers: { "content-type": "application/json" },
          body: jsonContent,
        })
      );

      const result = await webFetch({ url: "https://api.example.com/data" });

      expect(result.success).toBe(true);
      expect(result.content).toBe(jsonContent);
      expect(result.contentType).toBe("application/json");
    });

    it("should handle binary content metadata", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: 404, ok: false })
      );
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          headers: { "content-type": "image/png" },
          body: "binary-data",
        })
      );

      const result = await webFetch({ url: "https://example.com/image.png" });

      expect(result.success).toBe(true);
      expect(result.content).toContain("[Binary content:");
      expect(result.contentType).toBe("image/png");
    });

    it("should truncate large content", async () => {
      const largeContent = "x".repeat(150 * 1024); // 150 KB

      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: 404, ok: false })
      );
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          headers: { "content-type": "text/plain" },
          body: largeContent,
        })
      );

      const result = await webFetch({ url: "https://example.com/large.txt" });

      expect(result.success).toBe(true);
      expect(result.truncated).toBe(true);
      expect(result.content?.length).toBeLessThan(largeContent.length);
    });
  });

  describe("error handling", () => {
    it("should handle 404 errors", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: 404, ok: false })
      );
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 404,
          statusText: "Not Found",
        })
      );

      const result = await webFetch({ url: "https://example.com/notfound" });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(404);
      expect(result.error).toContain("404");
    });

    it("should handle 500 errors", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: 404, ok: false })
      );
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 500,
          statusText: "Internal Server Error",
        })
      );

      const result = await webFetch({ url: "https://example.com/error" });

      expect(result.success).toBe(false);
      expect(result.statusCode).toBe(500);
    });

    it("should handle timeout errors", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: 404, ok: false })
      );
      mockFetch.mockImplementationOnce(() => {
        const error = new Error("Aborted");
        error.name = "AbortError";
        return Promise.reject(error);
      });

      const result = await webFetch({
        url: "https://example.com/slow",
        timeout: 1000,
      });

      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(true);
      expect(result.error).toContain("timed out");
    });

    it("should handle network errors", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: 404, ok: false })
      );
      mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

      const result = await webFetch({ url: "https://example.com/offline" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    });

    it("should handle SSL errors", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: 404, ok: false })
      );
      mockFetch.mockRejectedValueOnce(new Error("certificate has expired"));

      const result = await webFetch({ url: "https://example.com/ssl-error" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("SSL/TLS error");
    });
  });

  describe("robots.txt compliance", () => {
    it("should respect robots.txt disallow rules", async () => {
      // Return robots.txt with disallow rule
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          headers: { "content-type": "text/plain" },
          body: "User-agent: *\nDisallow: /private/",
        })
      );

      const result = await webFetch({
        url: "https://example.com/private/secret.html",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("robots.txt");
    });

    it("should allow paths not in robots.txt", async () => {
      // Return robots.txt with disallow rule
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          headers: { "content-type": "text/plain" },
          body: "User-agent: *\nDisallow: /private/",
        })
      );
      // Return the actual content
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          headers: { "content-type": "text/html" },
          body: "<html></html>",
        })
      );

      const result = await webFetch({ url: "https://example.com/public/page.html" });

      expect(result.success).toBe(true);
    });

    it("should allow all when robots.txt is missing", async () => {
      // Return 404 for robots.txt
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: 404, ok: false })
      );
      // Return the actual content
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          headers: { "content-type": "text/html" },
          body: "<html></html>",
        })
      );

      const result = await webFetch({ url: "https://example.com/any/path" });

      expect(result.success).toBe(true);
    });
  });

  describe("caching", () => {
    it("should cache responses", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: 404, ok: false })
      );
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          headers: { "content-type": "text/html" },
          body: "<html></html>",
        })
      );

      // First fetch
      await webFetch({ url: "https://example.com/cached" });

      // Second fetch should use cache
      const result = await webFetch({ url: "https://example.com/cached" });

      // Should only have called fetch twice (robots.txt + first request)
      // The second request should use cache
      expect(result.success).toBe(true);
    });

    it("should clear caches", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: 404, ok: false })
      );
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          headers: { "content-type": "text/html" },
          body: "<html></html>",
        })
      );

      await webFetch({ url: "https://example.com/cached" });
      clearWebFetchCaches();

      // After clearing, need to fetch again
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: 404, ok: false })
      );
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          headers: { "content-type": "text/html" },
          body: "<html></html>",
        })
      );

      const result = await webFetch({ url: "https://example.com/cached" });

      expect(result.success).toBe(true);
    });
  });

  describe("createWebFetchHandler", () => {
    it("should create a working handler", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ status: 404, ok: false })
      );
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          headers: { "content-type": "text/html" },
          body: "<html></html>",
        })
      );

      const handler = createWebFetchHandler();
      const result = await handler({ url: "https://example.com" });

      expect(result.success).toBe(true);
    });
  });

  describe("webFetchToolDefinition", () => {
    it("should have correct name", () => {
      expect(webFetchToolDefinition.name).toBe("web_fetch");
    });

    it("should have description", () => {
      expect(webFetchToolDefinition.description).toBeTruthy();
      expect(webFetchToolDefinition.description.length).toBeGreaterThan(50);
    });

    it("should have url as required parameter", () => {
      expect(webFetchToolDefinition.input_schema.properties.url).toBeDefined();
      expect(webFetchToolDefinition.input_schema.required).toContain("url");
    });

    it("should have optional timeout parameter", () => {
      expect(webFetchToolDefinition.input_schema.properties.timeout).toBeDefined();
    });
  });
});

describe("WebSearch", () => {
  beforeEach(() => {
    clearWebSearchCaches();
    clearSearchProvider();
    mockFetch.mockReset();
  });

  afterEach(() => {
    clearWebSearchCaches();
    clearSearchProvider();
  });

  describe("query validation", () => {
    it("should reject empty query", async () => {
      const result = await webSearch({ query: "" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("required");
    });

    it("should reject whitespace-only query", async () => {
      const result = await webSearch({ query: "   " });

      expect(result.success).toBe(false);
      expect(result.error).toContain("empty");
    });

    it("should reject query over 500 characters", async () => {
      const longQuery = "x".repeat(501);
      const result = await webSearch({ query: longQuery });

      expect(result.success).toBe(false);
      expect(result.error).toContain("too long");
    });
  });

  describe("provider configuration", () => {
    it("should fail when no provider is configured", async () => {
      const result = await webSearch({ query: "test query" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("No search provider configured");
    });

    it("should set and get provider name", () => {
      expect(getSearchProviderName()).toBeNull();

      setSearchProvider({
        name: "brave",
        baseUrl: "https://api.search.brave.com/res/v1",
        apiKey: "test-key",
      });

      expect(getSearchProviderName()).toBe("brave");
    });

    it("should clear provider", () => {
      setSearchProvider({
        name: "brave",
        baseUrl: "https://api.search.brave.com/res/v1",
      });

      clearSearchProvider();

      expect(getSearchProviderName()).toBeNull();
    });
  });

  describe("successful searches", () => {
    beforeEach(() => {
      setSearchProvider({
        name: "brave",
        baseUrl: "https://api.search.brave.com/res/v1",
        apiKey: "test-key",
      });
    });

    it("should return search results", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          headers: { "content-type": "application/json" },
          json: {
            web: {
              results: [
                {
                  title: "Result 1",
                  url: "https://example.com/1",
                  description: "Description 1",
                },
                {
                  title: "Result 2",
                  url: "https://example.com/2",
                  description: "Description 2",
                },
              ],
            },
          },
        })
      );

      const result = await webSearch({ query: "test query" });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(2);
      expect(result.results![0]!.title).toBe("Result 1");
      expect(result.results![0]!.url).toBe("https://example.com/1");
      expect(result.results![0]!.snippet).toBe("Description 1");
    });

    it("should respect maxResults", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          headers: { "content-type": "application/json" },
          json: {
            web: {
              results: [
                { title: "Result 1", url: "https://example.com/1", description: "D1" },
                { title: "Result 2", url: "https://example.com/2", description: "D2" },
                { title: "Result 3", url: "https://example.com/3", description: "D3" },
                { title: "Result 4", url: "https://example.com/4", description: "D4" },
                { title: "Result 5", url: "https://example.com/5", description: "D5" },
              ],
            },
          },
        })
      );

      const result = await webSearch({ query: "test", maxResults: 3 });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(3);
    });

    it("should cap maxResults at 20", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          headers: { "content-type": "application/json" },
          json: { web: { results: [] } },
        })
      );

      await webSearch({ query: "test", maxResults: 50 });

      // Verify the URL includes count=20 (capped)
      expect(mockFetch).toHaveBeenCalled();
      const calledUrl = mockFetch.mock.calls[0]![0] as string;
      expect(calledUrl).toContain("count=20");
    });
  });

  describe("search providers", () => {
    it("should work with serper provider", async () => {
      setSearchProvider({
        name: "serper",
        baseUrl: "https://google.serper.dev",
        apiKey: "test-key",
      });

      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          headers: { "content-type": "application/json" },
          json: {
            organic: [
              {
                title: "Serper Result",
                link: "https://serper.example.com",
                snippet: "Serper snippet",
              },
            ],
          },
        })
      );

      const result = await webSearch({ query: "test" });

      expect(result.success).toBe(true);
      expect(result.results![0]!.title).toBe("Serper Result");
      expect(result.results![0]!.url).toBe("https://serper.example.com");
    });

    it("should work with duckduckgo provider", async () => {
      setSearchProvider({
        name: "duckduckgo",
        baseUrl: "https://api.duckduckgo.com",
      });

      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          headers: { "content-type": "application/json" },
          json: {
            RelatedTopics: [
              {
                Text: "DuckDuckGo Result Text",
                FirstURL: "https://ddg.example.com",
              },
            ],
          },
        })
      );

      const result = await webSearch({ query: "test" });

      expect(result.success).toBe(true);
      expect(result.results![0]!.url).toBe("https://ddg.example.com");
    });
  });

  describe("error handling", () => {
    beforeEach(() => {
      setSearchProvider({
        name: "brave",
        baseUrl: "https://api.search.brave.com/res/v1",
      });
    });

    it("should handle API errors", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          ok: false,
          status: 403,
          statusText: "Forbidden",
        })
      );

      const result = await webSearch({ query: "test" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("403");
    });

    it("should handle timeout", async () => {
      mockFetch.mockImplementationOnce(() => {
        const error = new Error("Aborted");
        error.name = "AbortError";
        return Promise.reject(error);
      });

      const result = await webSearch({ query: "test", timeout: 1000 });

      expect(result.success).toBe(false);
      expect(result.timedOut).toBe(true);
    });

    it("should handle network errors", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network failure"));

      const result = await webSearch({ query: "test" });

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network failure");
    });

    it("should handle empty results gracefully", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          headers: { "content-type": "application/json" },
          json: { web: { results: [] } },
        })
      );

      const result = await webSearch({ query: "very obscure query" });

      expect(result.success).toBe(true);
      expect(result.results).toHaveLength(0);
      expect(result.resultCount).toBe(0);
    });
  });

  describe("caching", () => {
    beforeEach(() => {
      setSearchProvider({
        name: "brave",
        baseUrl: "https://api.search.brave.com/res/v1",
      });
    });

    it("should cache search results", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          headers: { "content-type": "application/json" },
          json: {
            web: {
              results: [
                { title: "Cached", url: "https://cached.com", description: "desc" },
              ],
            },
          },
        })
      );

      // First search
      await webSearch({ query: "cached query" });

      // Wait for rate limit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Second search should use cache (no additional fetch call)
      const result = await webSearch({ query: "cached query" });

      expect(result.success).toBe(true);
      expect(result.results![0]!.title).toBe("Cached");
      // Only one fetch call should have been made
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should clear caches", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          headers: { "content-type": "application/json" },
          json: { web: { results: [] } },
        })
      );

      await webSearch({ query: "test" });
      clearWebSearchCaches();

      // After clearing, a new fetch should be made
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          headers: { "content-type": "application/json" },
          json: { web: { results: [] } },
        })
      );

      await webSearch({ query: "test" });

      // Should have called fetch twice now
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("createWebSearchHandler", () => {
    it("should create a working handler", async () => {
      setSearchProvider({
        name: "brave",
        baseUrl: "https://api.search.brave.com/res/v1",
      });

      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          headers: { "content-type": "application/json" },
          json: { web: { results: [] } },
        })
      );

      const handler = createWebSearchHandler();
      const result = await handler({ query: "test" });

      expect(result.success).toBe(true);
    });
  });

  describe("webSearchToolDefinition", () => {
    it("should have correct name", () => {
      expect(webSearchToolDefinition.name).toBe("web_search");
    });

    it("should have description", () => {
      expect(webSearchToolDefinition.description).toBeTruthy();
      expect(webSearchToolDefinition.description.length).toBeGreaterThan(50);
    });

    it("should have query as required parameter", () => {
      expect(webSearchToolDefinition.input_schema.properties.query).toBeDefined();
      expect(webSearchToolDefinition.input_schema.required).toContain("query");
    });

    it("should have optional maxResults parameter", () => {
      expect(webSearchToolDefinition.input_schema.properties.maxResults).toBeDefined();
    });
  });
});
