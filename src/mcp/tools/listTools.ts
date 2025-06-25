import { z } from "zod";
import type { ToolDef } from "../_mcplib.ts";

const schema = z.object({
  category: z.enum(["typescript", "lsp", "all"]).optional().default("all")
    .describe("Filter tools by category (typescript, lsp, or all)"),
});

interface ToolInfo {
  name: string;
  description: string;
  category: "typescript" | "lsp";
  requiresLSP: boolean;
}

// Define all available tools with their metadata
const TOOLS_REGISTRY: ToolInfo[] = [
  // TypeScript tools (using Compiler API)
  {
    name: "find_references",
    description: "Find all references to a TypeScript symbol",
    category: "typescript",
    requiresLSP: false,
  },
  {
    name: "get_definitions", 
    description: "Get definition(s) of a TypeScript symbol",
    category: "typescript",
    requiresLSP: false,
  },
  {
    name: "get_diagnostics",
    description: "Get TypeScript diagnostics (errors, warnings) for a file",
    category: "typescript", 
    requiresLSP: false,
  },
  {
    name: "rename_symbol",
    description: "Rename a TypeScript symbol across the codebase",
    category: "typescript",
    requiresLSP: false,
  },
  {
    name: "delete_symbol",
    description: "Delete a TypeScript/JavaScript symbol and all its references",
    category: "typescript",
    requiresLSP: false,
  },
  {
    name: "move_file",
    description: "Move a TypeScript/JavaScript file and update all import statements",
    category: "typescript",
    requiresLSP: false,
  },
  {
    name: "move_directory",
    description: "Move a directory and update all TypeScript imports and references",
    category: "typescript",
    requiresLSP: false,
  },
  {
    name: "get_module_symbols",
    description: "Get all exported symbols from a TypeScript/JavaScript module",
    category: "typescript",
    requiresLSP: false,
  },
  {
    name: "get_type_in_module",
    description: "Get detailed signature information for a specific type from a module",
    category: "typescript",
    requiresLSP: false,
  },
  {
    name: "get_type_at_symbol",
    description: "Get type information for a TypeScript/JavaScript symbol at a specific location",
    category: "typescript",
    requiresLSP: false,
  },
  {
    name: "get_symbols_in_scope",
    description: "Get all symbols visible at a specific location in a TypeScript/JavaScript file",
    category: "typescript",
    requiresLSP: false,
  },
  
  // LSP tools (using Language Server Protocol)
  {
    name: "lsp_get_hover",
    description: "Get hover information (type signature, documentation) using LSP",
    category: "lsp",
    requiresLSP: true,
  },
  {
    name: "lsp_find_references",
    description: "Find all references to symbol across the codebase using LSP",
    category: "lsp",
    requiresLSP: true,
  },
  {
    name: "lsp_get_definitions",
    description: "Get the definition(s) of a symbol using LSP",
    category: "lsp",
    requiresLSP: true,
  },
  {
    name: "lsp_get_diagnostics",
    description: "Get diagnostics (errors, warnings) for a file using LSP",
    category: "lsp",
    requiresLSP: true,
  },
  {
    name: "lsp_rename_symbol",
    description: "Rename a symbol across the codebase using Language Server Protocol",
    category: "lsp",
    requiresLSP: true,
  },
  {
    name: "lsp_delete_symbol",
    description: "Delete a symbol and optionally all its references using LSP",
    category: "lsp",
    requiresLSP: true,
  },
  {
    name: "lsp_get_document_symbols",
    description: "Get all symbols (functions, classes, variables, etc.) in a document using LSP",
    category: "lsp",
    requiresLSP: true,
  },
  {
    name: "lsp_get_workspace_symbols",
    description: "Search for symbols across the entire workspace using LSP",
    category: "lsp",
    requiresLSP: true,
  },
  {
    name: "lsp_get_completion",
    description: "Get code completion suggestions at a specific position using LSP",
    category: "lsp",
    requiresLSP: true,
  },
  {
    name: "lsp_get_signature_help",
    description: "Get signature help (parameter hints) for function calls using LSP",
    category: "lsp",
    requiresLSP: true,
  },
  {
    name: "lsp_get_code_actions",
    description: "Get available code actions (quick fixes, refactorings, etc.) using LSP",
    category: "lsp",
    requiresLSP: true,
  },
  {
    name: "lsp_format_document",
    description: "Format an entire document using the language server's formatting provider",
    category: "lsp",
    requiresLSP: true,
  },
];

function formatToolsList(tools: ToolInfo[], category: string): string {
  const filteredTools = category === "all" 
    ? tools 
    : tools.filter(t => t.category === category);

  if (filteredTools.length === 0) {
    return `No tools found for category: ${category}`;
  }

  let result = `# Available MCP Tools (${category})\n\n`;
  
  // Group by category
  const typescript = filteredTools.filter(t => t.category === "typescript");
  const lsp = filteredTools.filter(t => t.category === "lsp");
  
  if (typescript.length > 0 && (category === "all" || category === "typescript")) {
    result += "## 🔧 TypeScript Tools (Compiler API)\n";
    result += "These tools use the TypeScript Compiler API directly and don't require an LSP server.\n\n";
    typescript.forEach(tool => {
      result += `### ${tool.name}\n`;
      result += `${tool.description}\n\n`;
    });
  }
  
  if (lsp.length > 0 && (category === "all" || category === "lsp")) {
    result += "## 🌐 LSP Tools (Language Server Protocol)\n";
    result += "These tools require a running Language Server.\n";
    result += "Make sure the appropriate LSP server is installed for your language.\n\n";
    lsp.forEach(tool => {
      result += `### ${tool.name}\n`;
      result += `${tool.description}\n\n`;
    });
  }
  
  result += "## 💡 Tips\n";
  result += "- Use TypeScript tools for fast, direct access to TypeScript features\n";
  result += "- Use LSP tools for IDE-like features (completions, formatting, etc.)\n";
  result += "- Get help for any tool: use the tool with no parameters to see its schema\n";
  
  return result;
}

export const listToolsTool: ToolDef<typeof schema> = {
  name: "list_tools",
  description: "List all available MCP tools with descriptions and categories",
  schema,
  execute: async ({ category = "all" }) => {
    return formatToolsList(TOOLS_REGISTRY, category);
  },
};

// Also export for use in other modules
export { TOOLS_REGISTRY };