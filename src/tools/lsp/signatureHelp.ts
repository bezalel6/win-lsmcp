import type { LSPClient } from "@lsmcp/lsp-client";
import { z } from "zod";
import path from "path";
import fs from "fs/promises";
import { pathToFileURL } from "url";
import { SignatureHelp } from "@lsmcp/types";
import type { McpToolDef } from "@lsmcp/types";
import { resolveLineParameter } from "@lsmcp/lsp-client";

const schemaShape = {
  root: z.string().describe("Root directory for resolving relative paths"),
  filePath: z
    .string()
    .describe("File path to get signature help for (relative to root)"),
  line: z
    .union([z.number(), z.string()])
    .describe("Line number (1-based) or string to match in the line"),
  target: z
    .string()
    .describe("Function call or text at the position to get signature help for")
    .optional(),
};

const schema = z.object(schemaShape);

function formatSignatureHelp(help: SignatureHelp): string {
  if (help.signatures.length === 0) {
    return "No signature help available";
  }

  const activeSignature = help.activeSignature ?? 0;
  const signature = help.signatures[activeSignature];

  if (!signature) {
    return "No active signature found";
  }

  let result = "";

  // Format the signature label
  result += `Signature: ${signature.label}\n`;

  // Add documentation if available
  if (signature.documentation) {
    const doc =
      typeof signature.documentation === "string"
        ? signature.documentation
        : signature.documentation.value;
    if (doc) {
      result += `\nDocumentation:\n${doc}\n`;
    }
  }

  // Format parameters
  if (signature.parameters && signature.parameters.length > 0) {
    result += "\nParameters:\n";
    const activeParameter = help.activeParameter ?? 0;

    for (let i = 0; i < signature.parameters.length; i++) {
      const param = signature.parameters[i];
      const isActive = i === activeParameter;
      const prefix = isActive ? "→ " : "  ";

      // Extract parameter name from label
      let paramName = "";
      if (typeof param.label === "string") {
        paramName = param.label;
      } else {
        // Label is [start, end] offsets into signature.label
        paramName = signature.label.substring(param.label[0], param.label[1]);
      }

      result += `${prefix}${paramName}`;

      // Add parameter documentation if available
      if (param.documentation) {
        const paramDoc =
          typeof param.documentation === "string"
            ? param.documentation
            : param.documentation.value;
        if (paramDoc) {
          result += ` - ${paramDoc}`;
        }
      }

      result += "\n";
    }
  }

  // Show which signature is active if there are multiple
  if (help.signatures.length > 1) {
    result += `\nSignature ${activeSignature + 1} of ${help.signatures.length}`;
  }

  return result;
}

async function handleGetSignatureHelp(
  { root, filePath, line, target }: z.infer<typeof schema>,
  client: LSPClient,
): Promise<string> {
  if (!client) {
    throw new Error("LSP client not initialized");
  }

  // Convert to absolute path
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(root, filePath);

  // Check if file exists
  await fs.access(absolutePath);

  // Convert to file URI
  const fileUri = pathToFileURL(absolutePath).toString();

  // Read the file content
  const content = await fs.readFile(absolutePath, "utf-8");

  // Resolve line parameter
  const lines = content.split("\n");
  const lineIndex = resolveLineParameter(lines, line);

  // Determine character position
  const lineText = lines[lineIndex];
  let character = 0;

  if (target) {
    // Find the position within or after the target text
    const targetIndex = lineText.indexOf(target);
    if (targetIndex !== -1) {
      // Position cursor inside the function call (usually after the opening parenthesis)
      character = targetIndex + target.length;
      // Look for opening parenthesis after the target
      const afterTarget = lineText.substring(character);
      const parenIndex = afterTarget.indexOf("(");
      if (parenIndex !== -1) {
        character += parenIndex + 1;
      }
    }
  } else {
    // Default to first non-whitespace character
    const match = lineText.match(/\S/);
    if (match) {
      character = match.index || 0;
    }
  }

  // Open the document in LSP
  client.openDocument(fileUri, content);

  try {
    // Wait a bit for LSP to process the document
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Get signature help
    const help = await client.getSignatureHelp(fileUri, {
      line: lineIndex,
      character,
    });

    if (!help) {
      return `No signature help available at ${filePath}:${lineIndex + 1}:${
        character + 1
      }`;
    }

    // Format the signature help
    const formatted = formatSignatureHelp(help);
    return `Signature help at ${filePath}:${lineIndex + 1}:${
      character + 1
    }:\n\n${formatted}`;
  } finally {
    // Close the document
    client.closeDocument(fileUri);
  }
}

/**
 * Create signature help tool with injected LSP client
 */
export function createSignatureHelpTool(
  client: LSPClient,
): McpToolDef<typeof schema> {
  return {
    name: "get_signature_help",
    description:
      "Get signature help (parameter hints) for function calls at a specific position using LSP",
    schema,
    execute: async (args) => {
      return handleGetSignatureHelp(args, client);
    },
  };
}

// Legacy export - will be removed
export const lspGetSignatureHelpTool = null as any;
