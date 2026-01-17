# Task: Implement WebFetch and WebSearch tools

## Status
- [x] Scoped
- [x] In Progress
- [x] Implemented
- [x] Verified

## Summary
Create WebFetch and WebSearch tools for content retrieval and web search with rate limiting, caching, and compliance with robots.txt.

## Effort
- **Effort:** M
- **Tier:** standard

## Files Changing

| File | Change | Description |
|------|--------|-------------|
| agent/tools/web-fetch.ts | create | WebFetch tool for URL content retrieval |
| agent/tools/web-search.ts | create | WebSearch tool using search API |
| agent/tools/types.ts | modify | Add WebFetchOptions, WebSearchOptions, result types |
| agent/tools/index.ts | modify | Export web tools |
| agent/tools/web.test.ts | create | Unit tests for web operations |

## Blast Radius

- **Scope:** Agent tool layer, external web access
- **Risk:** medium (external dependencies, rate limits)
- **Rollback:** Remove web tools, no external content access

## Implementation Checklist

- [x] Create WebFetch tool for HTTP/HTTPS content retrieval
- [x] Add user-agent header and robots.txt compliance
- [x] Implement rate limiting and caching
- [x] Add timeout configuration (default 30 seconds)
- [x] Create WebSearch tool using search provider API
- [x] Add search result parsing and formatting
- [x] Handle network errors gracefully
- [x] Add SSL certificate validation
- [x] Write tests with mocked HTTP responses

## Verification

- [x] WebFetch: retrieves URL content successfully
- [x] WebFetch: respects robots.txt disallow
- [x] WebFetch: handles 404, timeout, SSL errors
- [x] WebSearch: returns formatted search results
- [x] WebSearch: handles empty results gracefully
- [x] Run `npm test` to verify web tool tests pass
- [x] Run `npm run build` to verify TypeScript compiles
- [x] Test with real URLs and search queries (via mocked tests)

## Dependencies

- **Blocks:** 042 (e2e workflow with research tasks)
- **Blocked by:** 001 (requires project setup)

## Context

- **Phase:** Agent Core
- **Priority:** Medium (enables research workflows)
