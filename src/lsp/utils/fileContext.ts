import path from "path";
import { pathToFileURL } from "url";
import { ErrorContext, formatError } from "../../mcp/utils/errorHandler.ts";
import type { FileSystemApi } from "../../core/io/FileSystemApi.ts";

/**
 * File context information for LSP operations
 */
export interface FileContext {
  /** Absolute path to the file */
  absolutePath: string;
  /** File URI in the format expected by LSP */
  fileUri: string;
  /** Content of the file */
  content: string;
}

/**
 * Load a file and prepare its context for LSP operations
 *
 * @param root - Root directory for resolving relative paths
 * @param filePath - File path (can be relative or absolute)
 * @param fs - FileSystem API instance
 * @returns File context with absolute path, URI, and content
 */
export async function loadFileContext(
  root: string,
  filePath: string,
  fs: FileSystemApi,
): Promise<FileContext> {
  // Convert to absolute path
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.join(root, filePath);

  // Check if file exists
  if (!(await fs.exists(absolutePath))) {
    const context: ErrorContext = {
      operation: "file access",
      filePath: path.relative(root, absolutePath),
    };
    throw new Error(formatError(new Error("File not found"), context));
  }

  // Convert to file URI
  const fileUri = pathToFileURL(absolutePath).toString();

  // Read the file content
  try {
    const content = await fs.readFile(absolutePath, "utf-8");
    return { absolutePath, fileUri, content };
  } catch (error) {
    const context: ErrorContext = {
      operation: "file read",
      filePath: path.relative(root, absolutePath),
    };
    throw new Error(formatError(error, context));
  }
}
