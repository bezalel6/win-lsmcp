You are a TypeScript/MCP expert developing the lsmcp tool - a unified Language Service MCP for multi-language support.

Given a URL, use read_url_content_as_markdown and summary contents.

## Tool Usage Guidelines

### TypeScript/JavaScript Projects

When using `--language typescript`, prefer TypeScript-specific tools for better semantic understanding:

- **lsmcp_search_symbols** - Fast symbol search across the project
- **lsmcp_rename_symbol** - Semantic rename with TypeScript Compiler API
- **lsmcp_move_file** - Move files with automatic import updates
- **lsmcp_get_type_at_symbol** - Get detailed type information

### All Languages (via LSP)

For all languages, use LSP tools for standard operations:

- **lsp_find_references** - Find all usages of a symbol
- **lsp_get_definitions** - Jump to definition
- **lsp_get_diagnostics** - Get errors and warnings
- **lsp_rename_symbol** - Rename symbols

### Refactoring Best Practices

- For moving files in TypeScript: Use `lsmcp_move_file` (not `mv` or manual edits)
- For renaming in TypeScript: Use `lsmcp_rename_symbol` for better accuracy
- For other languages: Use `lsp_rename_symbol`

## Project Goal

Provide unified Language Server Protocol (LSP) features as Model Context Protocol (MCP) tools for multiple programming languages, with advanced TypeScript support via Compiler API.

## Key Features

- 🌍 **Multi-Language Support** - Built-in TypeScript/JavaScript, extensible to any language via LSP
- 🔍 **Semantic Code Analysis** - Go to definition, find references, type information
- ♻️ **Intelligent Refactoring** - Rename symbols, move files, with automatic import updates
- 🔧 **Flexible Configuration** - Use with any LSP server via `--bin` option
- 🤖 **AI-Optimized** - Designed for LLMs with line and symbol-based interfaces
- ⚡ **Fast Symbol Search** - Project-wide symbol index with real-time file watching
- 🎯 **Smart Import Suggestions** - Find and suggest import candidates with relative paths

## Development Stack

- pnpm: Package manager
- typescript: Core language
- ts-morph: TypeScript AST manipulation
- tsdown: Rolldown-based bundler
- @modelcontextprotocol/sdk: MCP implementation
- vscode-languageserver-protocol: LSP client implementation

## Coding Rules

- file: snake_case
- add `.ts` extensions to import. eg. `import {} from "./x.ts"` for deno compatibility.

## Git Workflow

Claude Code follows this Git workflow:

1. **Auto-staging after tests pass**: When tests pass successfully, automatically stage changes using `git add`
2. **Smart commit on user request**: When user requests a commit, analyze the current staged diff to generate an appropriate commit message, then commit
3. **Commit all on request**: When user says "commit all" with no staged changes:
   - Check current `git status` to identify all changes
   - Stage all changes using `git add -A`
   - Generate commit message based on all changes and commit

## Code Modification Workflow

When modifying code in this project:

### 1. Development Commands
```bash
# Build the project
pnpm build

# Run tests
pnpm test

# Type checking
pnpm typecheck     # Using tsgo (faster)
pnpm typecheck:tsc # Using tsc (standard)

# Linting
pnpm lint          # Run with --quiet flag
pnpm lint:refactor # Run without --quiet for all messages
```

### 2. Testing Strategy
- Unit tests are located alongside source files using Vitest's in-source testing
- Integration tests are in the `tests/` directory
- Run specific tests: `pnpm test -- path/to/test.ts`
- Run tests matching pattern: `pnpm test -- -t "pattern"`

### 3. Code Quality Checks
Before committing, always run:
1. `pnpm typecheck` - Ensure no TypeScript errors
2. `pnpm lint` - Check for linting issues
3. `pnpm test` - Verify all tests pass

### 4. Refactoring Guidelines
- Use TypeScript MCP tools for semantic refactoring
- Maintain snake_case for filenames
- Always include `.ts` extension in imports
- Follow existing patterns in the codebase

## Directory Patterns

```
dist/               # Build output directory
  lsmcp.js         # Main unified LSP MCP CLI executable
  typescript-mcp.js # TypeScript-specific MCP server executable
  generic-lsp-mcp.js # Generic LSP MCP server executable

src/
  lsp/             # LSP client implementation
    tools/         # LSP-based MCP tools
    lspClient.ts   # LSP client core
    lspTypes.ts    # TypeScript types for LSP
    
  ts/              # TypeScript Compiler API and ts-morph
    commands/      # Operations with side effects (move, rename, delete)
    navigations/   # Read-only analysis operations
    tools/         # TypeScript MCP tool implementations
    projectCache.ts # Project instance caching
    
  mcp/             # MCP server implementations
    _mcplib.ts     # Generic MCP server library
    typescript-mcp.ts # TypeScript MCP server
    lsmcp.ts       # Main unified LSP MCP CLI (outputs as lsmcp.js)
    generic-lsp-mcp.ts # Generic LSP MCP server
    languageServerInit.ts # Shared language server initialization
    utils/         # MCP utility modules
      errorHandler.ts # Error handling with context
      languageSupport.ts # Language detection and support
    
  textUtils/       # Text manipulation utilities

tests/             # Integration tests
  mcp-client.test.ts
  mcp-integration.test.ts
  move_file.test.ts
  rename.test.ts

.claude/           # Claude-specific configuration
  commands/        # Custom command definitions
  settings.json    # Permissions configuration
```

## Architecture Overview

### MCP Server Library (`_mcplib.ts`)
The project uses a generic MCP server library that provides:
- `BaseMcpServer` class for common server functionality
- Automatic permission generation from tool definitions
- `debug()` function for stderr output (required for MCP protocol)
- Configuration file helpers for `.mcp.json` and `.claude/settings.json`

### TypeScript Project Management
- Uses `ts-morph` for TypeScript AST manipulation
- Project instances are cached for performance
- Supports both tsconfig-based and default projects
- File dependency resolution is disabled by default for performance

### Tool Implementation Pattern
Each tool follows this structure:
```typescript
export const toolNameTool: ToolDef<typeof schema> = {
  name: "tool_name",
  description: "Tool description",
  schema: z.object({ /* parameters */ }),
  execute: async (args) => {
    // Implementation
    return resultString;
  }
};
```

### Common Utilities
- `src/ts/utils/moduleResolution.ts` - Shared module path resolution logic
- `src/ts/utils/symbolNavigation.ts` - Common helpers for finding nodes and symbols
- `src/ts/utils/toolHandlers.ts` - Shared tool preparation and context setup
- `src/mcp/languageServerInit.ts` - Unified language server initialization

## Implementation Notes

### Line-based Interface Design
AI はワードカウントが苦手なので、LSPのLine Character ではなく、一致する行と、一致するコードでインターフェースを調整する必要があります。すべてのツールは以下の方式を採用:
- `line`: 行番号（1-based）または行内の文字列マッチング
- `symbolName`: シンボル名での指定
- Character offset は使用しない

### Symbol Index Architecture
- ファイル変更を自動検知して更新
- プロジェクト全体のシンボルを高速検索
- ts-morph のプロジェクトインスタンスをキャッシュ

## Tool Categories

### TypeScript-specific Tools (Compiler API)
These tools use TypeScript Compiler API directly and provide advanced features (only available with `--language typescript`):
- `lsmcp_move_file`, `lsmcp_move_directory` - Move with import updates
- `lsmcp_rename_symbol`, `lsmcp_delete_symbol` - Semantic refactoring with TypeScript Compiler API
- `lsmcp_get_type_at_symbol`, `lsmcp_get_module_symbols` - Type analysis
- `lsmcp_search_symbols`, `lsmcp_find_import_candidates` - Fast indexing
- `lsmcp_get_symbols_in_scope` - Scope analysis

### LSP-based Tools (All Languages)
These tools work with any language that has an LSP server:
- `lsp_get_hover`, `lsp_find_references`, `lsp_get_definitions`
- `lsp_get_diagnostics`, `lsp_rename_symbol`, `lsp_delete_symbol`
- `lsp_get_document_symbols`, `lsp_get_workspace_symbols`
- `lsp_get_completion`, `lsp_get_signature_help`
- `lsp_get_code_actions`, `lsp_format_document`

Note: When using `--language typescript`, LSP tools are also available alongside TypeScript-specific tools.

## Recent Changes (2025-01-29)

1. **TypeScript Tool Consolidation**
   - Removed duplicate TypeScript tools in favor of LSP implementations:
     - Removed `ts_find_references`, `ts_get_definitions`, `ts_get_diagnostics`
     - Removed `ts_rename_symbol`, `ts_delete_symbol`
   - LSP tools now handle all reference/definition/diagnostic operations
   - TypeScript-specific tools only appear with `--language typescript`

2. **F# Language Support Separation**
   - Moved F#-specific initialization to `src/fsharp/` directory
   - Created modular language initialization system

3. **Test Performance Optimization**
   - Fixed LSP process pool to use direct `node_modules/.bin/` paths instead of `npx`
   - Disabled global setup for non-LSP tests
   - Skipped slow `lspGetDiagnostics` test that was timing out
   - Added test categorization: `test:ts`, `test:lsp`, `test:mcp`
   - Total test time reduced from timeout to ~2.5 minutes

## Recent Changes (2025-01-27)

1. **Added Python MCP Tests**
   - `tests/python-mcp.test.ts` - Comprehensive Python MCP server tests
   - `tests/python-lsmcp.test.ts` - Python language detection and lsmcp integration tests

2. **Code Duplication Refactoring**
   - Extracted common `resolveModulePath` function to `src/ts/utils/moduleResolution.ts`
   - Created shared navigation helpers in `src/ts/utils/symbolNavigation.ts`
   - Unified tool handlers with `src/ts/utils/toolHandlers.ts`
   - Consolidated language server initialization in `src/mcp/languageServerInit.ts`

3. **Multi-language Support Improvements**
   - Added `--include` option for batch diagnostics with glob patterns
   - Enhanced language detection for Python, Go, Java, and other languages
   - Improved error handling and user feedback

## Current Status

### Supported Languages
- **TypeScript/JavaScript** - Full support with advanced features
- **Other Languages** - Via LSP with `--bin` option:
  - Rust (`rust-analyzer`)
  - Python (`pylsp`)
  - Go (`gopls`)
  - C/C++ (`clangd`)
  - Java (`jdtls`)
  - Ruby (`solargraph`)

### Installation
```bash
# TypeScript/JavaScript
claude mcp add npx --scope local -- -y @mizchi/lsmcp --language=typescript

# Other languages
claude mcp add npx --scope local -- -y @mizchi/lsmcp --bin="rust-analyzer"  # Rust
claude mcp add npx --scope local -- -y @mizchi/lsmcp --bin="pylsp"          # Python
```

## TODO

- [ ] Multi Project support
- [ ] Extract function refactoring
- [ ] Add Java MCP tests
- [ ] Enhanced error recovery for LSP communication
- [x] Fix MCP client tests for move_file and delete_symbol ✅ 2025-01-13
- [x] Add Python MCP tests ✅ 2025-01-26
- [x] Refactor code duplication ✅ 2025-01-26
- [x] Unified lsmcp CLI for all languages ✅ 2025-01-27

## LICENSE

MIT