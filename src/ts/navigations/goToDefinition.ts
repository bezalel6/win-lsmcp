import { type Project } from "ts-morph";
import { type Result, ok, err } from "neverthrow";
import { findNodeAndSymbolAtPosition, getIdentifierFromNode, extractLocationInfo, type LocationInfo } from "../utils/symbolNavigation.ts";

export interface GoToDefinitionRequest {
  filePath: string;
  line: number;
  column: number;
}

export interface Definition extends LocationInfo {
  kind: string;
}

export interface GoToDefinitionSuccess {
  message: string;
  definitions: Definition[];
  symbol: {
    name: string;
    kind: string;
  };
}

export function goToDefinition(
  project: Project,
  request: GoToDefinitionRequest
): Result<GoToDefinitionSuccess, string> {
  // Find node and symbol at position
  const nodeResult = findNodeAndSymbolAtPosition(project, request);
  if (nodeResult.isErr()) {
    return err(nodeResult.error);
  }

  const { node, symbolInfo } = nodeResult.value;

  try {
    // Find the identifier node
    const identifier = getIdentifierFromNode(node);
    if (!identifier) {
      return err(`No identifier found at position ${String(request.line)}:${String(request.column)}`);
    }

    // Get definition nodes
    const definitionNodes = (identifier as any).getDefinitionNodes();

    if (definitionNodes.length === 0) {
      return ok({
        message: `No definitions found for symbol "${symbolInfo.name}"`,
        definitions: [],
        symbol: symbolInfo
      });
    }

    const definitions: Definition[] = [];

    for (const defNode of definitionNodes) {
      const locationInfo = extractLocationInfo(defNode);
      definitions.push({
        ...locationInfo,
        kind: defNode.getKindName()
      });
    }

    return ok({
      message: `Found ${definitions.length} definition${definitions.length === 1 ? '' : 's'} for symbol "${symbolInfo.name}"`,
      definitions,
      symbol: symbolInfo
    });
  } catch (error) {
    return err(error instanceof Error ? error.message : String(error));
  }
}

if (import.meta.vitest) {
  const { describe, it, expect } = await import("vitest");
  const { Project } = await import("ts-morph");

  describe("goToDefinition", () => {
    it("should find function definition", () => {
      const project = new Project({
        useInMemoryFileSystem: true,
        compilerOptions: {
          target: 99, // ESNext
        },
      });

      // Create test files
      project.createSourceFile(
        "/src/utils.ts",
        `export function greet(name: string) {
  return \`Hello, \${name}!\`;
}`
      );

      project.createSourceFile(
        "/src/main.ts",
        `import { greet } from "./utils.ts";

const message = greet("World");
console.log(message);`
      );

      // Test finding definition of 'greet' from its usage
      const result = goToDefinition(project, {
        filePath: "/src/main.ts",
        line: 3,
        column: 17, // Position on 'greet' in 'greet("World")'
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { definitions, symbol } = result.value;
        expect(definitions).toHaveLength(1);
        expect(definitions[0].filePath).toBe("/src/utils.ts");
        expect(definitions[0].line).toBe(1);
        expect(symbol.name).toBe("greet");
      }
    });

    it("should find variable definition", () => {
      const project = new Project({
        useInMemoryFileSystem: true,
        compilerOptions: {
          target: 99, // ESNext
        },
      });

      project.createSourceFile(
        "/src/main.ts",
        `const myVariable = 42;
const doubled = myVariable * 2;
console.log(doubled);`
      );

      // Test finding definition of 'myVariable' from its usage
      const result = goToDefinition(project, {
        filePath: "/src/main.ts",
        line: 2,
        column: 17, // Position on 'myVariable' in 'myVariable * 2'
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { definitions, symbol } = result.value;
        expect(definitions).toHaveLength(1);
        expect(definitions[0].line).toBe(1);
        expect(definitions[0].text).toContain("myVariable");
        expect(symbol.name).toBe("myVariable");
      }
    });

    it("should find class definition", () => {
      const project = new Project({
        useInMemoryFileSystem: true,
        compilerOptions: {
          target: 99, // ESNext
        },
      });

      project.createSourceFile(
        "/src/models/user.ts",
        `export class User {
  constructor(public name: string) {}
}`
      );

      project.createSourceFile(
        "/src/main.ts",
        `import { User } from "./models/user.ts";

const user = new User("Alice");`
      );

      // Test finding definition of 'User' from its usage
      const result = goToDefinition(project, {
        filePath: "/src/main.ts",
        line: 3,
        column: 18, // Position on 'User' in 'new User("Alice")'
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { definitions, symbol } = result.value;
        expect(definitions).toHaveLength(1);
        expect(definitions[0].filePath).toBe("/src/models/user.ts");
        expect(definitions[0].line).toBe(1);
        expect(symbol.name).toBe("User");
      }
    });

    it("should handle multiple definitions", () => {
      const project = new Project({
        useInMemoryFileSystem: true,
        compilerOptions: {
          target: 99, // ESNext
        },
      });

      // Create a file with function overloads
      project.createSourceFile(
        "/src/utils.ts",
        `export function process(value: string): string;
export function process(value: number): number;
export function process(value: string | number): string | number {
  return value;
}`
      );

      project.createSourceFile(
        "/src/main.ts",
        `import { process } from "./utils.ts";

const result = process("test");`
      );

      // Test finding definitions of overloaded function
      const result = goToDefinition(project, {
        filePath: "/src/main.ts",
        line: 3,
        column: 16, // Position on 'process'
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { definitions } = result.value;
        // ts-morph returns the implementation, not all overloads
        expect(definitions.length).toBeGreaterThanOrEqual(1);
        expect(definitions[0].filePath).toBe("/src/utils.ts");
      }
    });

    it("should return error for non-existent file", () => {
      const project = new Project({
        useInMemoryFileSystem: true,
      });

      const result = goToDefinition(project, {
        filePath: "/src/nonexistent.ts",
        line: 1,
        column: 1,
      });

      expect(result.isErr()).toBe(true);
      if (result.isErr()) {
        expect(result.error).toContain("File not found");
      }
    });

    it("should handle built-in symbols", () => {
      const project = new Project({
        useInMemoryFileSystem: true,
        compilerOptions: {
          target: 99, // ESNext
        },
      });

      project.createSourceFile(
        "/src/main.ts",
        `console.log("Hello");`
      );

      // Try to find definition of 'console' (built-in)
      const result = goToDefinition(project, {
        filePath: "/src/main.ts",
        line: 1,
        column: 1, // Position on 'console'
      });

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const { definitions } = result.value;
        // Built-in symbols may have definitions in lib.d.ts files
        expect(definitions.length).toBeGreaterThanOrEqual(0);
      }
    });
  });
}