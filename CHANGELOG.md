# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0](https://github.com/mizchi/typescript-mcp/compare/v0.5.0...v0.6.0) (2025-01-30)

### Bug Fixes

* use direct node_modules path to avoid npx overhead in tests ([ffacc6c](https://github.com/mizchi/typescript-mcp/commit/ffacc6c71470a48b61cea7881488ce75650c1040))
* correct CI workflow step names and restore checks ([954575e](https://github.com/mizchi/typescript-mcp/commit/954575e6e8d8f125a8dedb5e8517182eb11b0dde))
* make integration tests more robust ([7a6e0de](https://github.com/mizchi/typescript-mcp/commit/7a6e0ded5d074d739aa829604289ec3fe79cb25d))
* repair integration tests and fix tool names ([10b21a5](https://github.com/mizchi/typescript-mcp/commit/10b21a5782aa02de067d34ef74e4dea7a2350f1f))
* update integration test paths and fix test expectations ([605b360](https://github.com/mizchi/typescript-mcp/commit/605b360505015e6457403fd79505fe9310b7eca4))

### Continuous Integration

* update workflow files for improved test execution ([246f5db](https://github.com/mizchi/typescript-mcp/commit/246f5db4fbac088c24cbec5c96cef8e387c26c8f))

### Tests

* improve test performance with proper categorization ([5d2c136](https://github.com/mizchi/typescript-mcp/commit/5d2c1368ad1e8c22e50b016f6e6e0f80b8c5b19d))
* categorize tests into unit/integration for faster CI ([f5e6596](https://github.com/mizchi/typescript-mcp/commit/f5e6596af8ba13c95af69737174b0b37fd5e95ef))
* temporarily skip failing integration tests ([0746300](https://github.com/mizchi/typescript-mcp/commit/0746300bb2c9ad616b056fde013f4cf088a37b81))

### Chores

* temporarily disable tests in pre-push hook ([c660e6c](https://github.com/mizchi/typescript-mcp/commit/c660e6c9bb9baf93e67a3c93c37dd890c3b0e17d))
* add git hooks for code quality ([2c02720](https://github.com/mizchi/typescript-mcp/commit/2c027206df9cea36e98b91eed01c47b54c16f3c5))
* format code with deno fmt ([8f8fbbc](https://github.com/mizchi/typescript-mcp/commit/8f8fbbcdafc45f825e686d72c52da96ed08cc16f))
* apply deno formatting to test fixture ([e6e92eb](https://github.com/mizchi/typescript-mcp/commit/e6e92eb936bb019c3e456ee90c1a88e0a04cfadd))

## [0.5.0] - 2025-01-28

### Added

#### 🎯 Debug Adapter Protocol (DAP) MCP v2 - Enhanced Debugging Tools
- **Complete DAP MCP Implementation**: Production-ready debug adapter protocol support
  - Session state management with proper lifecycle tracking
  - Breakpoint management with hit counts and conditional breakpoints
  - Debug event logging to JSONL files for analysis
  - Value tracking and history across debug sessions
  - Performance metrics tracking
  - Automatic cleanup of stale sessions
- **Enhanced Features**:
  - Export debug logs in multiple formats (JSON, JSONL, text)
  - Breakpoint statistics and hit count tracking
  - Session info and management tools
  - Comprehensive error handling and recovery
- **Examples and Documentation**:
  - Algorithm debugging examples (LCS, performance analysis)
  - Detailed usage documentation in `docs/dap-mcp-usage.md`
  - Test coverage for all debugging scenarios

### Changed
- Consolidated debug tools into single `dap-mcp` server
- Removed redundant `dap-demo` and `simple-debug` implementations

### Fixed
- Type errors in TypeScript tool handlers
- Flaky tests in DAP algorithm debugging suite
- MCP server startup issues

## [Unreleased]

### Added

#### 🐛 Debug Adapter Protocol (DAP) Support (2025-01-28)
- **DAP MCP Server**: New MCP server for debugging capabilities
  - Launch and attach to debug sessions
  - Set breakpoints with conditions
  - Step through code (step over/into/out)
  - Inspect variables and evaluate expressions
  - Stack trace inspection
  - Multiple concurrent debug sessions
  - Works with any DAP-compatible debugger (Node.js, Python, etc.)
- **Debug Session Management**:
  - Persistent session tracking
  - Automatic cleanup of stale sessions
  - Session metadata and statistics
- **Integration Examples**:
  - Algorithm debugging (LCS, performance analysis)
  - Test suite debugging
  - Multi-file debugging scenarios

#### 🌐 Multi-Language Support (2025-01-26)
- **Unified `lsmcp` CLI**: Single entry point for all languages
  - Use `--language` flag for specific languages
  - Use `--bin` flag for custom LSP servers
  - Automatic language detection based on project files
- **Enhanced Language Support**:
  - F# support with FSAutoComplete integration
  - Python improvements with better diagnostics
  - Configurable language mappings with glob patterns
- **Language-Specific Initialization**:
  - Modular initialization system
  - Per-language configuration options
  - Custom language server parameters

#### 🔧 Tool Improvements (2025-01-25)
- **Migration to LSP**: Gradual migration from TypeScript-specific to LSP tools
  - `ts_rename_symbol` → `lsp_rename_symbol`
  - `ts_delete_symbol` → `lsp_delete_symbol`
  - `ts_find_references` → `lsp_find_references`
  - `ts_get_definitions` → `lsp_get_definitions`
  - `ts_get_diagnostics` → `lsp_get_diagnostics`
  - See [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for details
- **TypeScript Tool Prefixes**: Added `ts_` prefix to avoid conflicts
- **New Tools**:
  - `lsp_get_workspace_symbols` - Search symbols across workspace
  - Event-driven diagnostics with automatic fallback

### Changed
- **Project Structure**:
  - Moved to modular architecture
  - Separated LSP and TypeScript-specific implementations
  - Improved test organization (unit vs integration)
- **Performance**:
  - Optimized LSP diagnostics with caching
  - Fixed stale file contents issue (#8)
  - Improved test performance with categorization
- **Error Handling**:
  - Enhanced error messages with context
  - Better recovery from LSP failures
  - Improved timeout handling

### Fixed
- LSP diagnostics stale file contents issue (#8)
- Multi-language support for non-TypeScript projects (#15)
- Test reliability in CI environments
- Import/export order variations in tests
- Git hooks preventing commits
- TypeScript tool name conflicts

### Developer Experience
- Added comprehensive test suite for all tools
- Improved documentation with examples
- Better error messages and debugging info
- Consistent tool naming conventions

## [0.4.0] - 2025-01-12

### Added
- Initial release of TypeScript MCP tools
- Core TypeScript refactoring tools
- LSP-based tools for multi-language support
- Basic MCP server implementation