/**
 * Tests for DOCX Skill Integration
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import {
  createDocxBuffer,
  createDocxFile,
  createSimpleDocx,
  DocxDocumentOptions,
  DocumentParagraph,
  DocumentSection,
} from "./docx-integration.js";

describe("DOCX Integration", () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "docx-test-"));
  });

  afterEach(async () => {
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("createDocxBuffer", () => {
    it("creates a buffer for a simple document", async () => {
      const options: DocxDocumentOptions = {
        title: "Test Document",
        sections: [
          {
            content: [
              { type: "paragraph", text: "Hello World" },
            ],
          },
        ],
      };

      const buffer = await createDocxBuffer(options);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
      // Check for DOCX magic bytes (PK zip header)
      expect(buffer[0]).toBe(0x50); // P
      expect(buffer[1]).toBe(0x4b); // K
    });

    it("creates a document with headings", async () => {
      const options: DocxDocumentOptions = {
        title: "Heading Test",
        sections: [
          {
            content: [
              { type: "paragraph", text: "Main Title", options: { heading: 1 } },
              { type: "paragraph", text: "Section", options: { heading: 2 } },
              { type: "paragraph", text: "Subsection", options: { heading: 3 } },
              { type: "paragraph", text: "Regular paragraph" },
            ],
          },
        ],
      };

      const buffer = await createDocxBuffer(options);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("creates a document with formatted text runs", async () => {
      const options: DocxDocumentOptions = {
        title: "Formatting Test",
        sections: [
          {
            content: [
              {
                type: "paragraph",
                textRuns: [
                  { text: "Bold", format: { bold: true } },
                  { text: " and ", format: {} },
                  { text: "Italic", format: { italics: true } },
                  { text: " text", format: {} },
                ],
              },
            ],
          },
        ],
      };

      const buffer = await createDocxBuffer(options);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("creates a document with bullet list", async () => {
      const options: DocxDocumentOptions = {
        title: "List Test",
        sections: [
          {
            content: [
              { type: "paragraph", text: "Item 1", options: { bullet: true } },
              { type: "paragraph", text: "Item 2", options: { bullet: true } },
              { type: "paragraph", text: "Item 3", options: { bullet: true } },
            ],
          },
        ],
      };

      const buffer = await createDocxBuffer(options);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("creates a document with numbered list", async () => {
      const options: DocxDocumentOptions = {
        title: "Numbered List Test",
        sections: [
          {
            content: [
              { type: "paragraph", text: "First", options: { numbered: true } },
              { type: "paragraph", text: "Second", options: { numbered: true } },
              { type: "paragraph", text: "Third", options: { numbered: true } },
            ],
          },
        ],
      };

      const buffer = await createDocxBuffer(options);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("creates a document with a table", async () => {
      const options: DocxDocumentOptions = {
        title: "Table Test",
        sections: [
          {
            content: [
              {
                type: "table",
                table: {
                  headerRow: true,
                  rows: [
                    [{ content: "Name" }, { content: "Value" }],
                    [{ content: "Item 1" }, { content: "100" }],
                    [{ content: "Item 2" }, { content: "200" }],
                  ],
                },
              },
            ],
          },
        ],
      };

      const buffer = await createDocxBuffer(options);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("creates a document with page break", async () => {
      const options: DocxDocumentOptions = {
        title: "Page Break Test",
        sections: [
          {
            content: [
              { type: "paragraph", text: "Page 1 content" },
              { type: "pageBreak" },
              { type: "paragraph", text: "Page 2 content" },
            ],
          },
        ],
      };

      const buffer = await createDocxBuffer(options);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("creates a document with header and footer", async () => {
      const options: DocxDocumentOptions = {
        title: "Header Footer Test",
        sections: [
          {
            options: {
              header: "Company Name",
              footer: "Confidential",
              pageNumbers: true,
            },
            content: [
              { type: "paragraph", text: "Document with header and footer" },
            ],
          },
        ],
      };

      const buffer = await createDocxBuffer(options);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("creates a document with landscape orientation", async () => {
      const options: DocxDocumentOptions = {
        title: "Landscape Test",
        sections: [
          {
            options: {
              orientation: "landscape",
            },
            content: [
              { type: "paragraph", text: "Landscape document" },
            ],
          },
        ],
      };

      const buffer = await createDocxBuffer(options);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("creates a document with table of contents", async () => {
      const options: DocxDocumentOptions = {
        title: "TOC Test",
        sections: [
          {
            content: [
              { type: "toc", tocTitle: "Table of Contents" },
              { type: "paragraph", text: "Introduction", options: { heading: 1 } },
              { type: "paragraph", text: "Content here" },
              { type: "paragraph", text: "Chapter 2", options: { heading: 1 } },
              { type: "paragraph", text: "More content" },
            ],
          },
        ],
      };

      const buffer = await createDocxBuffer(options);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("creates a document with alignment options", async () => {
      const options: DocxDocumentOptions = {
        title: "Alignment Test",
        sections: [
          {
            content: [
              { type: "paragraph", text: "Left aligned", options: { alignment: "left" } },
              { type: "paragraph", text: "Center aligned", options: { alignment: "center" } },
              { type: "paragraph", text: "Right aligned", options: { alignment: "right" } },
              { type: "paragraph", text: "Justified text here", options: { alignment: "justified" } },
            ],
          },
        ],
      };

      const buffer = await createDocxBuffer(options);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe("createDocxFile", () => {
    it("creates a file in the workspace", async () => {
      const filePath = "output/test.docx";
      const options: DocxDocumentOptions = {
        title: "File Test",
        sections: [
          {
            content: [{ type: "paragraph", text: "Test content" }],
          },
        ],
      };

      const result = await createDocxFile(options, filePath, testDir);

      expect(result.success).toBe(true);
      expect(result.bytesWritten).toBeGreaterThan(0);
      expect(result.filePath).toContain("test.docx");

      // Verify file exists
      const fileExists = await fs.access(result.filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    it("adds .docx extension if missing", async () => {
      const filePath = "document";
      const options: DocxDocumentOptions = {
        title: "Extension Test",
        sections: [
          {
            content: [{ type: "paragraph", text: "Test" }],
          },
        ],
      };

      const result = await createDocxFile(options, filePath, testDir);

      expect(result.success).toBe(true);
      expect(result.filePath).toMatch(/\.docx$/);
    });

    it("rejects paths outside workspace", async () => {
      const filePath = "../outside/test.docx";
      const options: DocxDocumentOptions = {
        title: "Outside Test",
        sections: [
          {
            content: [{ type: "paragraph", text: "Test" }],
          },
        ],
      };

      const result = await createDocxFile(options, filePath, testDir);

      expect(result.success).toBe(false);
      expect(result.error).toContain("within workspace");
    });

    it("creates parent directories if needed", async () => {
      const filePath = "deep/nested/folder/test.docx";
      const options: DocxDocumentOptions = {
        title: "Nested Test",
        sections: [
          {
            content: [{ type: "paragraph", text: "Test" }],
          },
        ],
      };

      const result = await createDocxFile(options, filePath, testDir);

      expect(result.success).toBe(true);

      // Verify directory was created
      const dirPath = path.join(testDir, "deep", "nested", "folder");
      const dirExists = await fs.access(dirPath).then(() => true).catch(() => false);
      expect(dirExists).toBe(true);
    });
  });

  describe("createSimpleDocx", () => {
    it("creates a simple document with title and paragraphs", async () => {
      const result = await createSimpleDocx(
        "My Report",
        ["First paragraph.", "Second paragraph.", "Third paragraph."],
        "simple.docx",
        testDir
      );

      expect(result.success).toBe(true);
      expect(result.bytesWritten).toBeGreaterThan(0);

      // Verify file exists
      const fileExists = await fs.access(result.filePath).then(() => true).catch(() => false);
      expect(fileExists).toBe(true);
    });

    it("handles empty paragraphs array", async () => {
      const result = await createSimpleDocx(
        "Title Only",
        [],
        "title-only.docx",
        testDir
      );

      expect(result.success).toBe(true);
    });
  });

  describe("Complex Documents", () => {
    it("creates a professional report structure", async () => {
      const content: DocumentParagraph[] = [
        { type: "paragraph", text: "Annual Report 2024", options: { heading: 1 } },
        { type: "paragraph", text: "Executive Summary", options: { heading: 2 } },
        { type: "paragraph", text: "This report summarizes the key achievements and metrics." },
        { type: "paragraph", text: "Key Metrics", options: { heading: 2 } },
        {
          type: "table",
          table: {
            headerRow: true,
            rows: [
              [{ content: "Metric" }, { content: "Q1" }, { content: "Q2" }],
              [{ content: "Revenue" }, { content: "$1.2M" }, { content: "$1.5M" }],
              [{ content: "Users" }, { content: "10,000" }, { content: "15,000" }],
            ],
          },
        },
        { type: "paragraph", text: "Highlights", options: { heading: 2 } },
        { type: "paragraph", text: "Product launch successful", options: { bullet: true } },
        { type: "paragraph", text: "Expanded to 3 new markets", options: { bullet: true } },
        { type: "paragraph", text: "Customer satisfaction up 25%", options: { bullet: true } },
      ];

      const options: DocxDocumentOptions = {
        title: "Annual Report 2024",
        author: "Test Company",
        defaultFont: "Arial",
        sections: [
          {
            options: {
              header: "Annual Report 2024",
              pageNumbers: true,
            },
            content,
          },
        ],
      };

      const buffer = await createDocxBuffer(options);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(1000);
    });

    it("creates a document with mixed formatting in text runs", async () => {
      const content: DocumentParagraph[] = [
        {
          type: "paragraph",
          textRuns: [
            { text: "Important: ", format: { bold: true, color: "FF0000" } },
            { text: "This text contains ", format: {} },
            { text: "bold", format: { bold: true } },
            { text: ", ", format: {} },
            { text: "italic", format: { italics: true } },
            { text: ", and ", format: {} },
            { text: "underlined", format: { underline: true } },
            { text: " text.", format: {} },
          ],
        },
      ];

      const options: DocxDocumentOptions = {
        title: "Formatting Demo",
        sections: [{ content }],
      };

      const buffer = await createDocxBuffer(options);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it("creates multiple sections with different options", async () => {
      const sections: DocumentSection[] = [
        {
          options: { orientation: "portrait" },
          content: [
            { type: "paragraph", text: "Portrait Section", options: { heading: 1 } },
            { type: "paragraph", text: "This section is in portrait mode." },
          ],
        },
        {
          options: { orientation: "landscape" },
          content: [
            { type: "paragraph", text: "Landscape Section", options: { heading: 1 } },
            { type: "paragraph", text: "This section is in landscape mode." },
          ],
        },
      ];

      const options: DocxDocumentOptions = {
        title: "Multi-Section Document",
        sections,
      };

      const buffer = await createDocxBuffer(options);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});
