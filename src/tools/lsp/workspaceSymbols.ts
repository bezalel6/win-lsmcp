import type { LSPClient } from "@internal/lsp-client";
import { z } from "zod";
import { SymbolInformation, SymbolKind } from "@internal/types";
import type { McpToolDef } from "@internal/types";
import { fileURLToPath } from "url";

const schemaShape = {
  query: z
    .string()
    .describe("Search query for symbols (e.g., class name, function name)"),
  root: z
    .string()
    .describe("Root directory for resolving relative paths")
    .optional(),
};

const schema = z.object(schemaShape);

function getSymbolKindName(kind: SymbolKind): string {
  const symbolKindNames: Record<SymbolKind, string> = {
    [SymbolKind.File]: "File",
    [SymbolKind.Module]: "Module",
    [SymbolKind.Namespace]: "Namespace",
    [SymbolKind.Package]: "Package",
    [SymbolKind.Class]: "Class",
    [SymbolKind.Method]: "Method",
    [SymbolKind.Property]: "Property",
    [SymbolKind.Field]: "Field",
    [SymbolKind.Constructor]: "Constructor",
    [SymbolKind.Enum]: "Enum",
    [SymbolKind.Interface]: "Interface",
    [SymbolKind.Function]: "Function",
    [SymbolKind.Variable]: "Variable",
    [SymbolKind.Constant]: "Constant",
    [SymbolKind.String]: "String",
    [SymbolKind.Number]: "Number",
    [SymbolKind.Boolean]: "Boolean",
    [SymbolKind.Array]: "Array",
    [SymbolKind.Object]: "Object",
    [SymbolKind.Key]: "Key",
    [SymbolKind.Null]: "Null",
    [SymbolKind.EnumMember]: "EnumMember",
    [SymbolKind.Struct]: "Struct",
    [SymbolKind.Event]: "Event",
    [SymbolKind.Operator]: "Operator",
    [SymbolKind.TypeParameter]: "TypeParameter",
  };
  return symbolKindNames[kind] || "Unknown";
}

function formatSymbolInformation(
  symbol: SymbolInformation,
  root?: string,
): string {
  const kind = getSymbolKindName(symbol.kind);
  const deprecated = symbol.deprecated ? " (deprecated)" : "";
  const container = symbol.containerName ? ` in ${symbol.containerName}` : "";

  // Convert file URI to relative path if possible
  let filePath = symbol.location.uri;
  try {
    const absolutePath = fileURLToPath(symbol.location.uri);
    if (root) {
      // Make path relative to root
      filePath = absolutePath.startsWith(root + "/")
        ? absolutePath.substring(root.length + 1)
        : absolutePath;
    } else {
      filePath = absolutePath;
    }
  } catch {
    // Keep original URI if conversion fails
  }

  return `${symbol.name} [${kind}]${deprecated}${container}
  File: ${filePath}
  Range: ${symbol.location.range.start.line + 1}:${
    symbol.location.range.start.character + 1
  } - ${symbol.location.range.end.line + 1}:${
    symbol.location.range.end.character + 1
  }`;
}

// Temporarily disabled - see TODO below
async function handleGetWorkspaceSymbols(
  { query, root }: z.infer<typeof schema>,
  client: LSPClient,
): Promise<string> {
  if (!client) {
    throw new Error("LSP client not initialized");
  }

  // Check if the server supports workspace symbols
  const capabilities = client.getServerCapabilities();
  if (!capabilities?.workspaceSymbolProvider) {
    // Special handling for TypeScript servers
    if (
      client.languageId === "typescript" ||
      client.languageId === "javascript"
    ) {
      throw new Error(
        "Workspace symbols search is temporarily disabled for TypeScript/JavaScript. " +
          "This feature requires proper project initialization which is not yet implemented for tsserver. " +
          "Consider using document symbols or file search instead.",
      );
    }

    throw new Error(
      "Workspace symbols search is not supported by this language server. " +
        "This feature requires a language server with workspace symbol support.",
    );
  }

  // Get workspace symbols
  const symbols = await client.getWorkspaceSymbols(query);

  if (symbols.length === 0) {
    return `No symbols found matching "${query}"`;
  }

  // Sort symbols by file and then by line number
  const sortedSymbols = symbols.sort((a: any, b: any) => {
    const fileCompare = a.location.uri.localeCompare(b.location.uri);
    if (fileCompare !== 0) return fileCompare;

    const lineCompare =
      a.location.range.start.line - b.location.range.start.line;
    if (lineCompare !== 0) return lineCompare;

    return a.location.range.start.character - b.location.range.start.character;
  });

  // Format the symbols
  let result = `Found ${symbols.length} symbol(s) matching "${query}":\n\n`;

  let currentFile = "";
  for (const symbol of sortedSymbols) {
    // Add file header when switching files
    if (symbol.location.uri !== currentFile) {
      currentFile = symbol.location.uri;
      let displayPath = currentFile;
      try {
        const absolutePath = fileURLToPath(currentFile);
        displayPath =
          root && absolutePath.startsWith(root + "/")
            ? absolutePath.substring(root.length + 1)
            : absolutePath;
      } catch {
        // Keep original URI
      }
      result += `\n=== ${displayPath} ===\n\n`;
    }

    result += formatSymbolInformation(symbol, root) + "\n\n";
  }

  return result.trim();
}

/**
 * Create workspace symbols tool with injected LSP client
 */
export function createWorkspaceSymbolsTool(
  client: LSPClient,
): McpToolDef<typeof schema> {
  return {
    name: "get_workspace_symbols",
    description:
      "Search for symbols (classes, functions, variables, etc.) across the entire workspace using LSP. " +
      "Note: This feature may not be supported by all language servers. " +
      "TypeScript/JavaScript support is temporarily disabled.",
    schema,
    execute: async (args) => {
      return handleGetWorkspaceSymbols(args, client);
    },
  };
}

// Legacy export - will be removed
export const lspGetWorkspaceSymbolsTool = null as any;
