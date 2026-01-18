/**
 * DOCX Skill Integration
 *
 * Creates Word documents using the docx-js library following the docx skill workflow.
 * Supports document structure, text formatting, tables, lists, images, and more.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  Header,
  Footer,
  AlignmentType,
  PageOrientation,
  LevelFormat,
  ExternalHyperlink,
  BorderStyle,
  WidthType,
  UnderlineType,
  ShadingType,
  VerticalAlign,
  PageNumber,
  PageBreak,
  HeadingLevel,
  TableOfContents,
} from "docx";
import fs from "fs/promises";
import path from "path";

/**
 * Text formatting options for a TextRun
 */
export interface TextFormatOptions {
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  strike?: boolean;
  color?: string;
  size?: number;
  font?: string;
  highlight?: string;
  superScript?: boolean;
  subScript?: boolean;
  smallCaps?: boolean;
}

/**
 * Paragraph options
 */
export interface ParagraphOptions {
  alignment?: "left" | "center" | "right" | "justified";
  spacing?: { before?: number; after?: number };
  indent?: { left?: number; right?: number; firstLine?: number };
  heading?: 1 | 2 | 3 | 4 | 5 | 6;
  bullet?: boolean;
  numbered?: boolean;
  numberingRef?: string;
}

/**
 * Table cell options
 */
export interface TableCellOptions {
  content: string | DocumentParagraph[];
  width?: number;
  backgroundColor?: string;
  verticalAlign?: "top" | "center" | "bottom";
  borders?: boolean;
  bold?: boolean;
}

/**
 * Table options
 */
export interface TableOptions {
  rows: TableCellOptions[][];
  columnWidths?: number[];
  headerRow?: boolean;
  borders?: boolean;
}

/**
 * Image type supported by docx library.
 * Note: SVG is excluded because it requires a fallback image in docx.
 */
type ImageType = "png" | "jpg" | "gif" | "bmp";

/**
 * Image options
 */
export interface ImageOptions {
  data: Buffer;
  type: ImageType;
  width: number;
  height: number;
  altText?: string;
}

/**
 * Section options
 */
export interface SectionOptions {
  orientation?: "portrait" | "landscape";
  margins?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
  header?: string;
  footer?: string;
  pageNumbers?: boolean;
}

/**
 * Document paragraph representation
 */
export interface DocumentParagraph {
  type: "paragraph" | "table" | "image" | "pageBreak" | "toc";
  text?: string;
  textRuns?: Array<{ text: string; format?: TextFormatOptions }>;
  options?: ParagraphOptions;
  table?: TableOptions;
  image?: ImageOptions;
  tocTitle?: string;
}

/**
 * Document section representation
 */
export interface DocumentSection {
  options?: SectionOptions;
  content: DocumentParagraph[];
}

/**
 * Full document options
 */
export interface DocxDocumentOptions {
  title?: string;
  author?: string;
  description?: string;
  sections: DocumentSection[];
  defaultFont?: string;
  defaultFontSize?: number;
}

/**
 * Result of document creation
 */
export interface DocxCreateResult {
  success: boolean;
  filePath: string;
  bytesWritten: number;
  error?: string;
}

/**
 * Numbering configuration for lists
 */
interface NumberingConfig {
  reference: string;
  levels: Array<{
    level: number;
    format: typeof LevelFormat.BULLET | typeof LevelFormat.DECIMAL;
    text: string;
    alignment: typeof AlignmentType.LEFT;
    style: {
      paragraph: {
        indent: { left: number; hanging: number };
      };
    };
  }>;
}

/**
 * Converts alignment string to AlignmentType
 */
function getAlignmentType(
  alignment?: "left" | "center" | "right" | "justified"
): typeof AlignmentType.LEFT | typeof AlignmentType.CENTER | typeof AlignmentType.RIGHT | typeof AlignmentType.JUSTIFIED {
  switch (alignment) {
    case "center":
      return AlignmentType.CENTER;
    case "right":
      return AlignmentType.RIGHT;
    case "justified":
      return AlignmentType.JUSTIFIED;
    default:
      return AlignmentType.LEFT;
  }
}

/**
 * Converts vertical alignment string to VerticalAlign
 */
function getVerticalAlign(
  align?: "top" | "center" | "bottom"
): typeof VerticalAlign.TOP | typeof VerticalAlign.CENTER | typeof VerticalAlign.BOTTOM {
  switch (align) {
    case "center":
      return VerticalAlign.CENTER;
    case "bottom":
      return VerticalAlign.BOTTOM;
    default:
      return VerticalAlign.TOP;
  }
}

/**
 * Highlight color type matching docx library
 */
type HighlightColor = "none" | "black" | "blue" | "cyan" | "darkBlue" | "darkCyan" | "darkGray" | "darkGreen" | "darkMagenta" | "darkRed" | "darkYellow" | "green" | "lightGray" | "magenta" | "red" | "white" | "yellow";

/**
 * HeadingLevel type for paragraph options
 */
type HeadingLevelValue = typeof HeadingLevel.HEADING_1 | typeof HeadingLevel.HEADING_2 | typeof HeadingLevel.HEADING_3 | typeof HeadingLevel.HEADING_4 | typeof HeadingLevel.HEADING_5 | typeof HeadingLevel.HEADING_6;

/**
 * Converts heading level number to HeadingLevel
 */
function getHeadingLevel(level?: 1 | 2 | 3 | 4 | 5 | 6): HeadingLevelValue | undefined {
  switch (level) {
    case 1:
      return HeadingLevel.HEADING_1;
    case 2:
      return HeadingLevel.HEADING_2;
    case 3:
      return HeadingLevel.HEADING_3;
    case 4:
      return HeadingLevel.HEADING_4;
    case 5:
      return HeadingLevel.HEADING_5;
    case 6:
      return HeadingLevel.HEADING_6;
    default:
      return undefined;
  }
}

/**
 * Creates a TextRun with formatting options
 */
function createTextRun(text: string, format?: TextFormatOptions): TextRun {
  const options: {
    text: string;
    bold?: boolean;
    italics?: boolean;
    underline?: { type: typeof UnderlineType.SINGLE };
    strike?: boolean;
    color?: string;
    size?: number;
    font?: string;
    highlight?: HighlightColor;
    superScript?: boolean;
    subScript?: boolean;
    smallCaps?: boolean;
  } = { text };

  if (format) {
    if (format.bold) options.bold = true;
    if (format.italics) options.italics = true;
    if (format.underline) options.underline = { type: UnderlineType.SINGLE };
    if (format.strike) options.strike = true;
    if (format.color) options.color = format.color;
    if (format.size) options.size = format.size;
    if (format.font) options.font = format.font;
    if (format.highlight) options.highlight = format.highlight as HighlightColor;
    if (format.superScript) options.superScript = true;
    if (format.subScript) options.subScript = true;
    if (format.smallCaps) options.smallCaps = true;
  }

  return new TextRun(options);
}

/**
 * Creates a Paragraph from DocumentParagraph
 */
function createParagraph(
  docPara: DocumentParagraph,
  numberingConfigs: Map<string, string>
): Paragraph | Table | null {
  if (docPara.type === "pageBreak") {
    return new Paragraph({ children: [new PageBreak()] });
  }

  if (docPara.type === "table" && docPara.table) {
    return createTable(docPara.table);
  }

  if (docPara.type === "image" && docPara.image) {
    return createImageParagraph(docPara.image);
  }

  if (docPara.type === "toc") {
    // Table of Contents requires special handling
    // Return null and handle separately
    return null;
  }

  const children: TextRun[] = [];

  // Add text runs if specified
  if (docPara.textRuns && docPara.textRuns.length > 0) {
    for (const run of docPara.textRuns) {
      children.push(createTextRun(run.text, run.format));
    }
  } else if (docPara.text) {
    children.push(createTextRun(docPara.text));
  }

  const paragraphOptions: {
    children: TextRun[];
    alignment?: typeof AlignmentType.LEFT | typeof AlignmentType.CENTER | typeof AlignmentType.RIGHT | typeof AlignmentType.JUSTIFIED;
    spacing?: { before?: number; after?: number };
    indent?: { left?: number; right?: number; firstLine?: number };
    heading?: HeadingLevelValue;
    numbering?: { reference: string; level: number };
  } = { children };

  if (docPara.options) {
    if (docPara.options.alignment) {
      paragraphOptions.alignment = getAlignmentType(docPara.options.alignment);
    }
    if (docPara.options.spacing) {
      paragraphOptions.spacing = docPara.options.spacing;
    }
    if (docPara.options.indent) {
      paragraphOptions.indent = docPara.options.indent;
    }
    if (docPara.options.heading) {
      paragraphOptions.heading = getHeadingLevel(docPara.options.heading);
    }
    if (docPara.options.bullet) {
      paragraphOptions.numbering = { reference: "bullet-list", level: 0 };
      numberingConfigs.set("bullet-list", "bullet");
    }
    if (docPara.options.numbered) {
      const ref = docPara.options.numberingRef || "numbered-list";
      paragraphOptions.numbering = { reference: ref, level: 0 };
      numberingConfigs.set(ref, "decimal");
    }
  }

  return new Paragraph(paragraphOptions);
}

/**
 * Creates a Table from TableOptions
 */
function createTable(tableOptions: TableOptions): Table {
  const tableBorder = tableOptions.borders !== false
    ? { style: BorderStyle.SINGLE, size: 1, color: "CCCCCC" }
    : { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };

  const cellBorders = {
    top: tableBorder,
    bottom: tableBorder,
    left: tableBorder,
    right: tableBorder,
  };

  // Calculate column widths
  const numCols = tableOptions.rows[0]?.length || 1;
  const defaultWidth = Math.floor(9360 / numCols); // Letter width with 1" margins
  const columnWidths = tableOptions.columnWidths || Array(numCols).fill(defaultWidth);

  const rows = tableOptions.rows.map((row, rowIndex) => {
    const isHeader = tableOptions.headerRow && rowIndex === 0;

    const cells = row.map((cell, colIndex) => {
      const cellWidth = columnWidths[colIndex] || defaultWidth;

      const cellChildren: Paragraph[] = [];
      if (typeof cell.content === "string") {
        cellChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: cell.content,
                bold: isHeader || cell.bold,
              }),
            ],
            alignment: isHeader ? AlignmentType.CENTER : AlignmentType.LEFT,
          })
        );
      } else if (Array.isArray(cell.content)) {
        const numberingConfigs = new Map<string, string>();
        for (const para of cell.content) {
          const p = createParagraph(para, numberingConfigs);
          if (p instanceof Paragraph) {
            cellChildren.push(p);
          }
        }
      }

      const cellOptions: {
        borders: typeof cellBorders;
        width: { size: number; type: typeof WidthType.DXA };
        children: Paragraph[];
        verticalAlign?: typeof VerticalAlign.TOP | typeof VerticalAlign.CENTER | typeof VerticalAlign.BOTTOM;
        shading?: { fill: string; type: typeof ShadingType.CLEAR };
      } = {
        borders: cellBorders,
        width: { size: cellWidth, type: WidthType.DXA },
        children: cellChildren,
      };

      if (cell.verticalAlign) {
        cellOptions.verticalAlign = getVerticalAlign(cell.verticalAlign);
      }

      if (cell.backgroundColor || isHeader) {
        cellOptions.shading = {
          fill: cell.backgroundColor || "D5E8F0",
          type: ShadingType.CLEAR,
        };
      }

      return new TableCell(cellOptions);
    });

    return new TableRow({
      tableHeader: isHeader,
      children: cells,
    });
  });

  return new Table({
    columnWidths,
    rows,
  });
}

/**
 * Creates a Paragraph with an image
 */
function createImageParagraph(imageOptions: ImageOptions): Paragraph {
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [
      new ImageRun({
        type: imageOptions.type,
        data: imageOptions.data,
        transformation: {
          width: imageOptions.width,
          height: imageOptions.height,
        },
        altText: imageOptions.altText
          ? {
              title: imageOptions.altText,
              description: imageOptions.altText,
              name: imageOptions.altText,
            }
          : undefined,
      }),
    ],
  });
}

/**
 * Creates a Header with text
 */
function createHeader(text: string): Header {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [new TextRun(text)],
      }),
    ],
  });
}

/**
 * Creates a Footer with optional page numbers
 */
function createFooter(text?: string, pageNumbers?: boolean): Footer {
  const children: (TextRun | { children: typeof PageNumber.CURRENT[] })[] = [];

  if (text) {
    children.push(new TextRun(text));
    if (pageNumbers) {
      children.push(new TextRun(" - Page "));
    }
  } else if (pageNumbers) {
    children.push(new TextRun("Page "));
  }

  if (pageNumbers) {
    children.push(new TextRun({ children: [PageNumber.CURRENT] }));
    children.push(new TextRun(" of "));
    children.push(new TextRun({ children: [PageNumber.TOTAL_PAGES] }));
  }

  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: children as TextRun[],
      }),
    ],
  });
}

/**
 * Builds numbering configuration for the document
 */
function buildNumberingConfig(numberingConfigs: Map<string, string>): NumberingConfig[] {
  const configs: NumberingConfig[] = [];

  for (const [ref, type] of numberingConfigs) {
    if (type === "bullet") {
      configs.push({
        reference: ref,
        levels: [
          {
            level: 0,
            format: LevelFormat.BULLET,
            text: "\u2022",
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: { left: 720, hanging: 360 },
              },
            },
          },
        ],
      });
    } else {
      configs.push({
        reference: ref,
        levels: [
          {
            level: 0,
            format: LevelFormat.DECIMAL,
            text: "%1.",
            alignment: AlignmentType.LEFT,
            style: {
              paragraph: {
                indent: { left: 720, hanging: 360 },
              },
            },
          },
        ],
      });
    }
  }

  return configs;
}

/**
 * Creates a Word document from the given options.
 *
 * @param options - Document options including sections and content
 * @returns Buffer containing the .docx file
 *
 * @example
 * ```typescript
 * const buffer = await createDocxBuffer({
 *   title: "My Document",
 *   sections: [{
 *     content: [
 *       { type: "paragraph", text: "Hello World", options: { heading: 1 } },
 *       { type: "paragraph", text: "This is a paragraph." }
 *     ]
 *   }]
 * });
 * ```
 */
export async function createDocxBuffer(options: DocxDocumentOptions): Promise<Buffer> {
  // Collect all numbering configurations needed
  const numberingConfigs = new Map<string, string>();

  // Process sections to collect numbering configs and build content
  const processedSections = options.sections.map((section) => {
    const sectionChildren: (Paragraph | Table | TableOfContents)[] = [];

    for (const docPara of section.content) {
      if (docPara.type === "toc") {
        sectionChildren.push(
          new TableOfContents(docPara.tocTitle || "Table of Contents", {
            hyperlink: true,
            headingStyleRange: "1-3",
          })
        );
      } else {
        const element = createParagraph(docPara, numberingConfigs);
        if (element) {
          sectionChildren.push(element);
        }
      }
    }

    return { section, children: sectionChildren };
  });

  // Build document with styles
  const doc = new Document({
    title: options.title,
    creator: options.author,
    description: options.description,
    styles: {
      default: {
        document: {
          run: {
            font: options.defaultFont || "Arial",
            size: options.defaultFontSize || 24, // 12pt
          },
        },
      },
      paragraphStyles: [
        {
          id: "Heading1",
          name: "Heading 1",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 32, bold: true, color: "000000", font: options.defaultFont || "Arial" },
          paragraph: { spacing: { before: 240, after: 240 } },
        },
        {
          id: "Heading2",
          name: "Heading 2",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 28, bold: true, color: "000000", font: options.defaultFont || "Arial" },
          paragraph: { spacing: { before: 180, after: 180 } },
        },
        {
          id: "Heading3",
          name: "Heading 3",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 26, bold: true, color: "000000", font: options.defaultFont || "Arial" },
          paragraph: { spacing: { before: 160, after: 160 } },
        },
        {
          id: "Heading4",
          name: "Heading 4",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 24, bold: true, color: "000000", font: options.defaultFont || "Arial" },
          paragraph: { spacing: { before: 140, after: 140 } },
        },
        {
          id: "Heading5",
          name: "Heading 5",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 24, bold: true, italics: true, color: "000000", font: options.defaultFont || "Arial" },
          paragraph: { spacing: { before: 120, after: 120 } },
        },
        {
          id: "Heading6",
          name: "Heading 6",
          basedOn: "Normal",
          next: "Normal",
          quickFormat: true,
          run: { size: 22, bold: true, color: "333333", font: options.defaultFont || "Arial" },
          paragraph: { spacing: { before: 100, after: 100 } },
        },
      ],
    },
    numbering: {
      config: buildNumberingConfig(numberingConfigs),
    },
    sections: processedSections.map(({ section, children }) => {
      const sectionProps: {
        page?: {
          margin?: { top?: number; right?: number; bottom?: number; left?: number };
          size?: { orientation?: typeof PageOrientation.PORTRAIT | typeof PageOrientation.LANDSCAPE };
        };
      } = {};

      if (section.options) {
        sectionProps.page = {};

        if (section.options.margins) {
          sectionProps.page.margin = {
            top: section.options.margins.top || 1440,
            right: section.options.margins.right || 1440,
            bottom: section.options.margins.bottom || 1440,
            left: section.options.margins.left || 1440,
          };
        } else {
          sectionProps.page.margin = { top: 1440, right: 1440, bottom: 1440, left: 1440 };
        }

        if (section.options.orientation === "landscape") {
          sectionProps.page.size = { orientation: PageOrientation.LANDSCAPE };
        }
      } else {
        sectionProps.page = {
          margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        };
      }

      const sectionConfig: {
        properties: typeof sectionProps;
        children: typeof children;
        headers?: { default: Header };
        footers?: { default: Footer };
      } = {
        properties: sectionProps,
        children,
      };

      if (section.options?.header) {
        sectionConfig.headers = {
          default: createHeader(section.options.header),
        };
      }

      if (section.options?.footer || section.options?.pageNumbers) {
        sectionConfig.footers = {
          default: createFooter(section.options.footer, section.options.pageNumbers),
        };
      }

      return sectionConfig;
    }),
  });

  return await Packer.toBuffer(doc);
}

/**
 * Creates a Word document and saves it to a file.
 *
 * @param options - Document options including sections and content
 * @param filePath - Path to save the document (should end in .docx)
 * @param workspacePath - Workspace root for path validation
 * @returns Result with success status and file info
 *
 * @example
 * ```typescript
 * const result = await createDocxFile(
 *   {
 *     title: "Report",
 *     sections: [{
 *       content: [
 *         { type: "paragraph", text: "Introduction", options: { heading: 1 } },
 *         { type: "paragraph", text: "This document describes..." }
 *       ]
 *     }]
 *   },
 *   "output/report.docx",
 *   "/home/user/workspace"
 * );
 * ```
 */
export async function createDocxFile(
  options: DocxDocumentOptions,
  filePath: string,
  workspacePath: string
): Promise<DocxCreateResult> {
  // Resolve file path
  let absolutePath: string;
  if (path.isAbsolute(filePath)) {
    absolutePath = path.normalize(filePath);
  } else {
    absolutePath = path.normalize(path.join(workspacePath, filePath));
  }

  // Validate path is within workspace
  const normalizedWorkspace = path.normalize(path.resolve(workspacePath));
  if (!absolutePath.startsWith(normalizedWorkspace + path.sep) && absolutePath !== normalizedWorkspace) {
    return {
      success: false,
      filePath: absolutePath,
      bytesWritten: 0,
      error: `File path must be within workspace: ${workspacePath}`,
    };
  }

  // Ensure .docx extension
  if (!absolutePath.toLowerCase().endsWith(".docx")) {
    absolutePath += ".docx";
  }

  try {
    // Create parent directories if needed
    const parentDir = path.dirname(absolutePath);
    await fs.mkdir(parentDir, { recursive: true });

    // Generate the document
    const buffer = await createDocxBuffer(options);

    // Write to file
    await fs.writeFile(absolutePath, buffer);

    return {
      success: true,
      filePath: absolutePath,
      bytesWritten: buffer.length,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      filePath: absolutePath,
      bytesWritten: 0,
      error: `Failed to create document: ${message}`,
    };
  }
}

/**
 * Creates a simple document with a title and paragraphs.
 * Convenience function for basic document creation.
 *
 * @param title - Document title
 * @param paragraphs - Array of paragraph texts
 * @param filePath - Path to save the document
 * @param workspacePath - Workspace root for path validation
 * @returns Result with success status and file info
 */
export async function createSimpleDocx(
  title: string,
  paragraphs: string[],
  filePath: string,
  workspacePath: string
): Promise<DocxCreateResult> {
  const content: DocumentParagraph[] = [
    { type: "paragraph", text: title, options: { heading: 1 } },
    ...paragraphs.map((text) => ({
      type: "paragraph" as const,
      text,
    })),
  ];

  return createDocxFile(
    {
      title,
      sections: [{ content }],
    },
    filePath,
    workspacePath
  );
}

/**
 * Creates a document with formatted text runs.
 * Useful for documents with mixed formatting.
 *
 * @param options - Document options
 * @returns Buffer containing the .docx file
 */
export async function createFormattedDocx(options: DocxDocumentOptions): Promise<Buffer> {
  return createDocxBuffer(options);
}

/**
 * Adds a hyperlink to the document content.
 * Returns a paragraph that can be included in document content.
 *
 * @param text - Link text
 * @param url - URL to link to
 * @returns Document paragraph with hyperlink
 */
export function createHyperlinkParagraph(text: string, url: string): Paragraph {
  return new Paragraph({
    children: [
      new ExternalHyperlink({
        children: [new TextRun({ text, color: "0000FF", underline: { type: UnderlineType.SINGLE } })],
        link: url,
      }),
    ],
  });
}
