import { describe, expect, it } from "vitest";
import { createDeterministicIntelligenceEngine } from "../../src/intelligence/engine.js";
import { RepositoryContextSchema, assertNoDanglingGraphEdges } from "../../src/core/domain/repository-context.js";
import { nodeServiceIssue, nodeServiceRepo } from "./__fixtures__/node-service.js";
import { unknownIssue, unknownRepo } from "./__fixtures__/unknown-repo.js";

describe("Repository Intelligence Engine v0.1", () => {
  it("emits a schema-valid RepositoryContext for a Node service fixture", async () => {
    const engine = createDeterministicIntelligenceEngine();
    const context = await engine.analyze({ issue: nodeServiceIssue, repo: nodeServiceRepo });

    expect(() => RepositoryContextSchema.parse(context)).not.toThrow();
    expect(context.schemaVersion).toBe("0.1.0");
    expect(context.stack.packageManager).toBe("npm");
    expect(context.stack.frameworks.map((framework) => framework.name)).toContain("Express");
    expect(context.stack.testFrameworks.map((framework) => framework.name)).toContain("Vitest");
    expect(context.classification.class).toBe("bug");
  });

  it("is deterministic for identical inputs", async () => {
    const engine = createDeterministicIntelligenceEngine();
    const first = await engine.analyze({ issue: nodeServiceIssue, repo: nodeServiceRepo });
    const second = await engine.analyze({ issue: nodeServiceIssue, repo: nodeServiceRepo });

    expect(JSON.stringify(first)).toEqual(JSON.stringify(second));
  });

  it("builds graph edges that only point to existing nodes", async () => {
    const engine = createDeterministicIntelligenceEngine();
    const context = await engine.analyze({ issue: nodeServiceIssue, repo: nodeServiceRepo });

    expect(() => assertNoDanglingGraphEdges(context.graph)).not.toThrow();
    const nodeIds = new Set(context.graph.nodes.map((node) => node.id));
    for (const edge of context.graph.edges) {
      expect(nodeIds.has(edge.from)).toBe(true);
      expect(nodeIds.has(edge.to)).toBe(true);
    }
  });

  it("labels affected files as heuristic with confidence and evidence", async () => {
    const engine = createDeterministicIntelligenceEngine();
    const context = await engine.analyze({ issue: nodeServiceIssue, repo: nodeServiceRepo });

    expect(context.affectedFiles.length).toBeGreaterThan(0);
    for (const file of context.affectedFiles) {
      expect(file.note).toBe("heuristic");
      expect(file.confidence).toBeGreaterThan(0);
      expect(file.confidence).toBeLessThanOrEqual(1);
      expect(file.evidence.length).toBeGreaterThan(0);
    }
  });

  it("degrades gracefully for unknown repositories", async () => {
    const engine = createDeterministicIntelligenceEngine();
    const context = await engine.analyze({ issue: unknownIssue, repo: unknownRepo });

    expect(context.repo.languages[0]?.name).toBe("unknown");
    expect(context.stack.packageManager).toBe("unknown");
    expect(context.architecture.pattern).toBe("unknown");
    expect(context.degraded?.reasons.length).toBeGreaterThan(0);
    expect(() => RepositoryContextSchema.parse(context)).not.toThrow();
  });
});