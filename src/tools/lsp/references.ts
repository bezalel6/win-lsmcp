import type { LSPClient, ToolDef } from "@lsmcp/lsp-client";
import { z } from "zod";
import { err, ok, type Result } from "neverthrow";
import { readFileSync } from "fs";
import path from "path";
import { ErrorContext, formatError } from "@lsmcp/lsp-client";
import { validateLineAndSymbol } from "@lsmcp/lsp-client";
import { readFileWithUri } from "../../shared/fileUtils.ts";

// Helper functions
function readFileWithMetadata(root: string, filePath: string) {
  const {
    content: fileContent,
    uri: fileUri,
    absolutePath,
  } = readFileWithUri(root, filePath);
  return { fileContent, fileUri, absolutePath };
}

const schema = z.object({
  root: z.string().describe("Root directory for resolving relative paths"),
  filePath: z
    .string()
    .describe("File path containing the symbol (relative to root)"),
  line: z
    .union([z.number(), z.string()])
    .describe("Line number (1-based) or string to match in the line"),
  symbolName: z.string().describe("Name of the symbol to find references for"),
});

type FindReferencesRequest = z.infer<typeof schema>;

interface Reference {
  filePath: string;
  line: number;
  column: number;
  text: string;
  preview: string;
}

interface FindReferencesSuccess {
  message: string;
  references: Reference[];
}

/**
 * Finds all references to a symbol using LSP
 */
async function findReferencesWithLSP(
  request: FindReferencesRequest,
  client: LSPClient,
): Promise<Result<FindReferencesSuccess, string>> {
  try {
    if (!client) {
      return err("LSP client not available");
    }

    // Read file content with metadata
    let fileContent: string;
    let fileUri: string;
    try {
      const result = readFileWithMetadata(request.root, request.filePath);
      fileContent = result.fileContent;
      fileUri = result.fileUri;
    } catch (error) {
      const context: ErrorContext = {
        operation: "find references",
        filePath: request.filePath,
        language: "lsp",
      };
      return err(formatError(error, context));
    }

    // Validate line and symbol
    let targetLine: number;
    let symbolPosition: number;
    try {
      const result = validateLineAndSymbol(
        fileContent,
        request.line,
        request.symbolName,
        request.filePath,
      );
      targetLine = result.lineIndex;
      symbolPosition = result.symbolIndex;
    } catch (error) {
      const context: ErrorContext = {
        operation: "symbol validation",
        filePath: request.filePath,
        symbolName: request.symbolName,
        details: { line: request.line },
      };
      return err(formatError(error, context));
    }

    // Open document in LSP
    client.openDocument(fileUri, fileContent);

    // Give LSP server time to process the document
    await new Promise<void>((resolve) => setTimeout(resolve, 1000));
    // Find references
    const locations = await client.findReferences(fileUri, {
      line: targetLine,
      character: symbolPosition,
    });

    // Convert LSP locations to our Reference format
    const references: Reference[] = [];

    for (const location of locations) {
      const refPath = location.uri?.replace("file://", "") || "";
      let refContent: string;
      try {
        refContent = readFileSync(refPath, "utf-8");
      } catch (error) {
        // Skip references in files we can't read
        continue;
      }
      const refLines = refContent.split("\n");

      // Get the text at the reference location
      const startLine = location.range.start.line;
      const startCol = location.range.start.character;
      const endCol = location.range.end.character;
      const refLineText = refLines[startLine] || "";
      const text = refLineText.substring(startCol, endCol);

      // Create preview with context
      const prevLine = startLine > 0 ? refLines[startLine - 1] : "";
      const nextLine =
        startLine < refLines.length - 1 ? refLines[startLine + 1] : "";
      const preview = [
        prevLine && `${startLine}: ${prevLine}`,
        `${startLine + 1}: ${refLineText}`,
        nextLine && `${startLine + 2}: ${nextLine}`,
      ]
        .filter(Boolean)
        .join("\n");

      references.push({
        filePath: path.relative(request.root, refPath),
        line: startLine + 1, // Convert to 1-based
        column: startCol + 1, // Convert to 1-based
        text,
        preview,
      });
    }

    return ok({
      message: `Found ${references.length} reference${
        references.length === 1 ? "" : "s"
      } to "${request.symbolName}"`,
      references,
    });
  } catch (error) {
    const context: ErrorContext = {
      operation: "find references",
      filePath: request.filePath,
      symbolName: request.symbolName,
      language: "lsp",
    };
    return err(formatError(error, context));
  }
}

export async function findReferences(
  request: FindReferencesRequest,
  client: LSPClient,
): Promise<Result<FindReferencesSuccess, string>> {
  return findReferencesWithLSP(request, client);
}

/**
 * Create references tool with injected LSP client
 */
export function createReferencesTool(
  client: LSPClient,
): ToolDef<typeof schema> {
  return {
    name: "find_references",
    description: "Find all references to symbol across the codebase using LSP",
    schema,
    execute: async (args: z.infer<typeof schema>) => {
      const result = await findReferencesWithLSP(args, client);
      if (result.isOk()) {
        const messages = [result.value.message];

        if (result.value.references.length > 0) {
          messages.push(
            result.value.references
              .map(
                (ref) =>
                  `\n${ref.filePath}:${ref.line}:${ref.column}\n${ref.preview}`,
              )
              .join("\n"),
          );
        }

        return messages.join("\n\n");
      } else {
        throw new Error(result.error);
      }
    },
  };
}

// Legacy export - will be removed
export const lspFindReferencesTool = null as any;

// Skip these tests - they require LSP server and should be run as integration tests
if (false && import.meta.vitest) {
  const { describe, it, expect, beforeAll, afterAll } = import.meta.vitest!;
  const { default: path } = await import("path");
  const { setupLSPForTest, teardownLSPForTest } = await import(
    "../../../tests/adapters/testHelpers.ts"
  );

  describe("lspFindReferencesTool", () => {
    const root = path.resolve(__dirname, "../../../..");

    beforeAll(async () => {
      await setupLSPForTest(root);
    }, 30000);

    afterAll(async () => {
      await teardownLSPForTest();
    }, 30000);

    it("should have correct tool definition", () => {
      expect(lspFindReferencesTool.name).toBe("find_references");
      expect(lspFindReferencesTool.description).toContain("references");
      expect(lspFindReferencesTool.schema.shape).toBeDefined();
      expect(lspFindReferencesTool.schema.shape.root).toBeDefined();
      expect(lspFindReferencesTool.schema.shape.filePath).toBeDefined();
      expect(lspFindReferencesTool.schema.shape.line).toBeDefined();
      expect(lspFindReferencesTool.schema.shape.symbolName).toBeDefined();
    });

    it("should find references to a type", async () => {
      const result = await lspFindReferencesTool.execute({
        root,
        filePath: "examples/typescript/types.ts",
        line: 1,
        symbolName: "Value",
      });

      expect(result).toContain("Found");
      expect(result).toContain("reference");
    });

    it("should find references to a function", async () => {
      const result = await lspFindReferencesTool.execute({
        root,
        filePath: "examples/typescript/types.ts",
        line: 10,
        symbolName: "getValue",
      });

      expect(result).toContain("Found");
      expect(result).toContain("getValue");
    });

    it("should handle string line matching", async () => {
      const result = await lspFindReferencesTool.execute({
        root,
        filePath: "examples/typescript/types.ts",
        line: "ValueWithOptional",
        symbolName: "ValueWithOptional",
      });

      expect(result).toContain("ValueWithOptional");
    });

    it("should handle symbol not found on line", async () => {
      await expect(
        lspFindReferencesTool.execute({
          root,
          filePath: "examples/typescript/types.ts",
          line: 1,
          symbolName: "nonexistent",
        }),
      ).rejects.toThrow('Symbol "nonexistent" not found');
    });

    it("should handle line not found", async () => {
      await expect(
        lspFindReferencesTool.execute({
          root,
          filePath: "examples/typescript/types.ts",
          line: "nonexistent line",
          symbolName: "Value",
        }),
      ).rejects.toThrow("Line containing");
    });

    it("should handle file not found", async () => {
      await expect(
        lspFindReferencesTool.execute({
          root,
          filePath: "nonexistent.ts",
          line: 1,
          symbolName: "test",
        }),
      ).rejects.toThrow();
    });

    it("should include preview context in results", async () => {
      const result = await lspFindReferencesTool.execute({
        root,
        filePath: "examples/typescript/types.ts",
        line: 11,
        symbolName: "v",
      });

      // Should include preview lines with colon separator
      expect(result).toContain(":");
    });

    it("should find references in the same file", async () => {
      // The Value type is defined and used in types.ts
      const result = await lspFindReferencesTool.execute({
        root,
        filePath: "examples/typescript/types.ts",
        line: 1,
        symbolName: "Value",
      });

      expect(result).toContain("Found");
      // Should find references to Value type
      expect(result).toContain("types.ts");
    });
  });
}
