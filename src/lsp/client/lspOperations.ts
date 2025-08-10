import { getActiveClient } from "../../lsp/lspClient.ts";
import type { LSPClient } from "../../lsp/lspTypes.ts";
import {
  type ErrorContext,
  errors,
  withErrorHandling,
} from "../../shared/errors/index.ts";
import { getServerCharacteristics } from "../../config/serverCharacteristics.ts";

/**
 * Options for LSP operations
 */
export interface LSPOperationOptions<T> {
  /** File URI for the document */
  fileUri: string;

  /** File content to open in LSP */
  fileContent: string;

  /** Language ID (default: from active client) */
  languageId?: string;

  /** Wait time after opening document (ms) */
  waitTime?: number;

  /** Timeout for the operation (ms) */
  timeout?: number;

  /** Explicit LSP client to use. If omitted, uses active client */
  client?: LSPClient;

  /** The actual LSP operation to perform */
  operation: (client: LSPClient) => Promise<T>;

  /** Error context for better error messages */
  errorContext?: ErrorContext;

  /** Override server characteristics for this operation */
  serverCharacteristics?: import("../../types/lsp.ts").ServerCharacteristics;
}

/**
 * Executes an LSP operation with proper document lifecycle management
 *
 * @example
 * ```typescript
 * const hover = await withLSPOperation({
 *   fileUri: "file:///path/to/file.ts",
 *   fileContent: content,
 *   operation: (client) => client.getHover(fileUri, position),
 *   errorContext: { filePath: "file.ts", operation: "hover" }
 * });
 * ```
 */
export async function withLSPOperation<T>(
  options: LSPOperationOptions<T>,
): Promise<T> {
  const client = options.client ?? getActiveClient();

  // Get server characteristics
  const characteristics = getServerCharacteristics(
    client.languageId || "unknown",
    options.serverCharacteristics,
  );

  const {
    fileUri,
    fileContent,
    languageId,
    waitTime = characteristics.documentOpenDelay,
    timeout = characteristics.operationTimeout,
    operation,
    errorContext = {},
  } = options;

  // Open document with proper language ID
  const actualLanguageId = languageId || client.languageId || "plaintext";
  client.openDocument(fileUri, fileContent, actualLanguageId);

  // Wait for LSP to process the document
  if (waitTime > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, waitTime));
  }

  // Execute the operation with timeout and error handling
  const operationPromise = withErrorHandling(() => operation(client), {
    ...errorContext,
    operation: errorContext.operation || "lsp_operation",
  });

  // Add timeout wrapper
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`LSP operation timed out after ${timeout}ms`));
    }, timeout);
  });

  return Promise.race([operationPromise, timeoutPromise]);
}

/**
 * Options for batch LSP operations
 */
export interface BatchLSPOperationOptions<T> {
  /** List of file URIs and contents */
  files: Array<{
    fileUri: string;
    fileContent: string;
  }>;

  /** Language ID for all files */
  languageId?: string;

  /** Wait time after opening all documents (ms) */
  waitTime?: number;

  /** Explicit LSP client to use for the batch. If omitted, uses active client */
  client?: LSPClient;

  /** The batch operation to perform */
  operation: (client: LSPClient) => Promise<T>;

  /** Error context */
  errorContext?: ErrorContext;
}

/**
 * Executes an LSP operation on multiple files
 *
 * @example
 * ```typescript
 * const diagnostics = await withBatchLSPOperation({
 *   files: fileList.map(f => ({ fileUri: f.uri, fileContent: f.content })),
 *   operation: async (client) => {
 *     const results = [];
 *     for (const file of fileList) {
 *       results.push(await client.getDiagnostics(file.uri));
 *     }
 *     return results;
 *   }
 * });
 * ```
 */
export async function withBatchLSPOperation<T>(
  options: BatchLSPOperationOptions<T>,
): Promise<T> {
  const client = options.client ?? getActiveClient();

  // Get server characteristics
  const characteristics = getServerCharacteristics(
    client.languageId || "unknown",
  );

  const {
    files,
    languageId,
    waitTime = characteristics.documentOpenDelay,
    operation,
    errorContext = {},
  } = options;

  // Open all documents
  const actualLanguageId = languageId || client.languageId || "plaintext";
  for (const { fileUri, fileContent } of files) {
    client.openDocument(fileUri, fileContent, actualLanguageId);
  }

  // Wait for LSP to process all documents
  if (waitTime > 0) {
    await new Promise<void>((resolve) => setTimeout(resolve, waitTime));
  }

  // Execute the operation with error handling
  return withErrorHandling(() => operation(client), {
    ...errorContext,
    operation: errorContext.operation || "batch_lsp_operation",
  });
}

/**
 * Helper to check if LSP client is available
 */
export function ensureLSPClient(language: string = "unknown"): LSPClient {
  const client = getActiveClient();
  if (!client) {
    throw errors.lspNotRunning(language);
  }
  return client;
}
