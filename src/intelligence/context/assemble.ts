import { REPOSITORY_CONTEXT_SCHEMA_VERSION, RepositoryContextSchema, assertNoDanglingGraphEdges, type RepositoryContext, type StackDetection, type RepositoryProfile } from "../../core/domain/repository-context.js";
import type { NormalizedIssue } from "../../core/domain/issue.js";
import type { RepoSnapshot } from "../../core/domain/repository-snapshot.js";
import { classifyIssue } from "../classifier/classify.js";
import { buildRepositoryGraph } from "../graph/builder.js";
import { scoreAffectedFiles } from "../impact/affected-files.js";
import { inferArchitecture } from "../impact/architecture.js";
import { detectRiskHotspots } from "../impact/risk-hotspots.js";

export function assembleRepositoryContext(input: { repo: RepoSnapshot; issue?: NormalizedIssue; stack: StackDetection; profile: RepositoryProfile; analyzerVersions: Record<string, string> }): RepositoryContext {
  const issueArg = input.issue ? { issue: input.issue } : {};
  const affectedFiles = scoreAffectedFiles({ repo: input.repo, ...issueArg });
  const architecture = inferArchitecture({ repo: input.repo, profile: input.profile, stack: input.stack });
  const graph = buildRepositoryGraph({ repo: input.repo, stack: input.stack, affectedFiles, ...issueArg });
  const classification = classifyIssue(input.issue);
  const riskHotspots = detectRiskHotspots({ repo: input.repo, stack: input.stack, affectedFiles });
  const degradedReasons = [];
  if (input.profile.languages.some((language) => language.name === "unknown")) degradedReasons.push("language detection returned unknown");
  if (input.stack.packageManager === "unknown") degradedReasons.push("package manager detection returned unknown");
  if (architecture.pattern === "unknown") degradedReasons.push("architecture inference returned unknown");
  assertNoDanglingGraphEdges(graph);
  const context = {
    schemaVersion: REPOSITORY_CONTEXT_SCHEMA_VERSION,
    repo: input.profile,
    ...issueArg,
    graph,
    stack: input.stack,
    architecture,
    affectedFiles,
    riskHotspots,
    classification,
    provenance: { engineVersion: "rie-v0.1" as const, analyzerVersions: input.analyzerVersions, sources: input.repo.files.map((file) => ({ path: file.path, description: "repository snapshot" })) },
    ...(degradedReasons.length > 0 ? { degraded: { reasons: degradedReasons, skipped: [] } } : {})
  } satisfies RepositoryContext;
  return RepositoryContextSchema.parse(context);
}