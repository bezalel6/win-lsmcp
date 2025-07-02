import type { LspAdapter } from "../types.ts";
import { execSync } from "child_process";

/**
 * Deno language server adapter
 */
export const denoAdapter: LspAdapter = {
  id: "deno",
  name: "Deno",
  baseLanguage: "typescript",
  description: "Deno language server",

  extensions: [
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".mjs",
    ".cjs",
    ".mts",
    ".cts",
    ".d.ts",
    ".d.mts",
    ".d.cts",
  ],

  lspCommand: "deno",
  lspArgs: ["lsp"],

  initializationOptions: {
    enable: true,
    lint: true,
    unstable: true,
  },
  doctor: async () => {
    try {
      execSync("which deno", { stdio: "ignore" });
      return { ok: true };
    } catch {
      return { ok: false, message: "deno not found in PATH" };
    }
  },
};
