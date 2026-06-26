import { z } from "zod";
import { IssueClassSchema, NormalizedIssueSchema } from "./issue.js";
import { RepoRefSchema } from "./repository-snapshot.js";

export const REPOSITORY_CONTEXT_SCHEMA_VERSION = "0.1.0";
export const REPOSITORY_GRAPH_SCHEMA_VERSION = "0.1.0";
const ConfidenceSchema = z.number().min(0).max(1);

export const SourceRefSchema = z.object({ path: z.string().optional(), field: z.string().optional(), description: z.string().min(1) });
export type SourceRef = z.infer<typeof SourceRefSchema>;

export const DetectedSignalSchema = z.object({ name: z.string().min(1), confidence: ConfidenceSchema, evidence: z.array(SourceRefSchema), heuristic: z.literal(true).default(true) });
export type DetectedSignal = z.infer<typeof DetectedSignalSchema>;

export const DegradedInfoSchema = z.object({ reasons: z.array(z.string()), skipped: z.array(z.string()).default([]) });
export type DegradedInfo = z.infer<typeof DegradedInfoSchema>;

export const RepositoryProfileSchema = z.object({
  ref: RepoRefSchema,
  type: z.enum(["app", "library", "cli", "service", "monorepo", "unknown"]),
  languages: z.array(z.object({ name: z.string(), share: ConfidenceSchema, confidence: ConfidenceSchema })),
  monorepo: z.object({ tool: z.string(), packages: z.array(z.string()), confidence: ConfidenceSchema }).optional(),
  docs: z.object({ readme: z.boolean(), contributing: z.boolean(), quality: z.enum(["rich", "sparse", "none"]) }),
  complexity: z.object({ value: z.enum(["low", "medium", "high"]), signals: z.array(z.string()) }),
  maturity: z.object({ value: z.enum(["early", "active", "mature"]), signals: z.array(z.string()) })
});
export type RepositoryProfile = z.infer<typeof RepositoryProfileSchema>;

export const StackDetectionSchema = z.object({
  packageManager: z.enum(["npm", "pnpm", "yarn", "bun", "pip", "cargo", "go", "unknown"]),
  frameworks: z.array(DetectedSignalSchema),
  testFrameworks: z.array(DetectedSignalSchema),
  buildSystems: z.array(DetectedSignalSchema),
  entryPoints: z.array(SourceRefSchema),
  configFiles: z.array(SourceRefSchema),
  ci: z.array(z.object({ provider: z.string(), workflows: z.array(z.string()), confidence: ConfidenceSchema }))
});
export type StackDetection = z.infer<typeof StackDetectionSchema>;

export const GraphNodeSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["module", "dependency", "service", "library", "test", "config", "doc", "issue", "affected-file"]),
  label: z.string().min(1),
  source: SourceRefSchema.optional()
});
export type GraphNode = z.infer<typeof GraphNodeSchema>;

export const GraphEdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  kind: z.enum(["depends-on", "tested-by", "configures", "documents", "relates-to", "may-affect"]),
  confidence: ConfidenceSchema,
  evidence: z.array(SourceRefSchema)
});
export type GraphEdge = z.infer<typeof GraphEdgeSchema>;

export const RepositoryGraphSchema = z.object({
  schemaVersion: z.literal(REPOSITORY_GRAPH_SCHEMA_VERSION),
  nodes: z.array(GraphNodeSchema),
  edges: z.array(GraphEdgeSchema),
  coverage: z.object({ filesScanned: z.number().int().nonnegative(), filesSkipped: z.number().int().nonnegative(), capped: z.boolean() })
});
export type RepositoryGraph = z.infer<typeof RepositoryGraphSchema>;

export const ArchitectureInferenceSchema = z.object({
  pattern: z.enum(["layered", "mvc", "clean", "hexagonal", "ddd", "monolith", "microservices", "library", "cli", "package", "plugin", "workspace", "hybrid", "unknown"]),
  confidence: ConfidenceSchema,
  evidence: z.array(SourceRefSchema),
  heuristic: z.literal(true).default(true)
});
export type ArchitectureInference = z.infer<typeof ArchitectureInferenceSchema>;

export const AffectedFileSchema = z.object({ path: z.string().min(1), confidence: ConfidenceSchema, reason: z.enum(["path-match", "code-search", "ownership", "graph-proximity", "import-graph"]), note: z.literal("heuristic"), evidence: z.array(SourceRefSchema) });
export type AffectedFile = z.infer<typeof AffectedFileSchema>;

export const RiskHotspotSchema = z.object({ description: z.string().min(1), severity: z.enum(["low", "medium", "high"]), confidence: ConfidenceSchema, evidence: z.array(SourceRefSchema) });
export type RiskHotspot = z.infer<typeof RiskHotspotSchema>;

export const IssueClassificationSchema = z.object({ class: IssueClassSchema, confidence: ConfidenceSchema, signals: z.array(z.string()) });
export type IssueClassification = z.infer<typeof IssueClassificationSchema>;

export const ContextProvenanceSchema = z.object({ engineVersion: z.literal("rie-v0.1"), analyzerVersions: z.record(z.string(), z.string()), sources: z.array(SourceRefSchema), generatedAt: z.string().optional() });
export type ContextProvenance = z.infer<typeof ContextProvenanceSchema>;

export const RepositoryContextSchema = z.object({
  schemaVersion: z.literal(REPOSITORY_CONTEXT_SCHEMA_VERSION),
  repo: RepositoryProfileSchema,
  issue: NormalizedIssueSchema.optional(),
  graph: RepositoryGraphSchema,
  stack: StackDetectionSchema,
  architecture: ArchitectureInferenceSchema,
  affectedFiles: z.array(AffectedFileSchema),
  riskHotspots: z.array(RiskHotspotSchema),
  classification: IssueClassificationSchema,
  provenance: ContextProvenanceSchema,
  degraded: DegradedInfoSchema.optional()
});
export type RepositoryContext = z.infer<typeof RepositoryContextSchema>;

export function assertNoDanglingGraphEdges(graph: RepositoryGraph): void {
  const ids = new Set(graph.nodes.map((node) => node.id));
  const dangling = graph.edges.find((edge) => !ids.has(edge.from) || !ids.has(edge.to));
  if (dangling) throw new Error(`RepositoryGraph has dangling edge: ${dangling.from} -> ${dangling.to}`);
}