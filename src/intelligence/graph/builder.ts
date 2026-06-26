import type { NormalizedIssue } from "../../core/domain/issue.js";
import { REPOSITORY_GRAPH_SCHEMA_VERSION, assertNoDanglingGraphEdges, type AffectedFile, type GraphEdge, type GraphNode, type RepositoryGraph, type StackDetection } from "../../core/domain/repository-context.js";
import type { RepoSnapshot } from "../../core/domain/repository-snapshot.js";

function nodeId(prefix: string, value: string): string { return `${prefix}:${value}`; }
function classifyFile(path: string): GraphNode["kind"] {
  if (/^test\/|\.test\.|\.spec\./u.test(path)) return "test";
  if (path.startsWith(".github/") || /(^|\/)(package.json|tsconfig.json|pnpm-workspace.yaml)$/u.test(path)) return "config";
  if (/readme|contributing|docs\//iu.test(path)) return "doc";
  if (/service|server|api/iu.test(path)) return "service";
  return "module";
}
function safePackageDeps(repo: RepoSnapshot): string[] {
  const pkg = repo.files.find((file) => file.path === "package.json");
  if (!pkg) return [];
  try { const parsed = JSON.parse(pkg.content.value) as { dependencies?: Record<string, string>; devDependencies?: Record<string, string> }; return [...Object.keys(parsed.dependencies ?? {}), ...Object.keys(parsed.devDependencies ?? {})].sort(); } catch { return []; }
}
function addEdge(edges: GraphEdge[], edge: GraphEdge): void {
  if (!edges.some((existing) => existing.from === edge.from && existing.to === edge.to && existing.kind === edge.kind)) edges.push(edge);
}

export function buildRepositoryGraph(input: { repo: RepoSnapshot; issue?: NormalizedIssue; stack: StackDetection; affectedFiles: AffectedFile[] }): RepositoryGraph {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  for (const file of input.repo.files) nodes.push({ id: nodeId("file", file.path), kind: classifyFile(file.path), label: file.path, source: { path: file.path, description: "repository snapshot file" } });

  if (input.issue) {
    const issueId = nodeId("issue", `${input.issue.ref.owner}/${input.issue.ref.repo}#${input.issue.ref.number}`);
    nodes.push({ id: issueId, kind: "issue", label: input.issue.title.value, source: { field: "issue.title", description: "normalized issue" } });
    for (const affected of input.affectedFiles) {
      const fileId = nodeId("file", affected.path);
      if (nodes.some((node) => node.id === fileId)) addEdge(edges, { from: issueId, to: fileId, kind: "may-affect", confidence: affected.confidence, evidence: affected.evidence });
    }
  }

  for (const dep of safePackageDeps(input.repo)) {
    const depId = nodeId("dep", dep);
    nodes.push({ id: depId, kind: "dependency", label: dep, source: { path: "package.json", description: "package dependency" } });
    for (const file of input.repo.files.filter((candidate) => candidate.path.startsWith("src/"))) {
      addEdge(edges, { from: nodeId("file", file.path), to: depId, kind: "depends-on", confidence: 0.35, evidence: [{ path: "package.json", description: "dependency available to source module" }] });
    }
  }

  const testFiles = input.repo.files.filter((file) => classifyFile(file.path) === "test");
  const sourceFiles = input.repo.files.filter((file) => ["module", "service"].includes(classifyFile(file.path)));
  for (const test of testFiles) {
    const normalizedTest = test.path.toLowerCase().replace(/\.test|\.spec|test\//gu, "");
    for (const source of sourceFiles) {
      const basename = source.path.toLowerCase().split("/").pop()?.replace(/\.[^.]+$/u, "") ?? "";
      if (basename && normalizedTest.includes(basename)) addEdge(edges, { from: nodeId("file", source.path), to: nodeId("file", test.path), kind: "tested-by", confidence: 0.72, evidence: [{ path: test.path, description: "test filename matches source basename" }] });
    }
  }

  for (const doc of input.repo.files.filter((file) => classifyFile(file.path) === "doc")) {
    for (const target of sourceFiles.slice(0, 5)) addEdge(edges, { from: nodeId("file", doc.path), to: nodeId("file", target.path), kind: "documents", confidence: 0.25, evidence: [{ path: doc.path, description: "documentation file present" }] });
  }

  const graph: RepositoryGraph = {
    schemaVersion: REPOSITORY_GRAPH_SCHEMA_VERSION,
    nodes: nodes.sort((a, b) => a.id.localeCompare(b.id)),
    edges: edges.sort((a, b) => `${a.from}:${a.to}:${a.kind}`.localeCompare(`${b.from}:${b.to}:${b.kind}`)),
    coverage: { filesScanned: input.repo.files.length, filesSkipped: 0, capped: input.repo.capped }
  };
  assertNoDanglingGraphEdges(graph);
  return graph;
}