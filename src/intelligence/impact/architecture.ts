import type { ArchitectureInference, RepositoryProfile, SourceRef, StackDetection } from "../../core/domain/repository-context.js";
import type { RepoSnapshot } from "../../core/domain/repository-snapshot.js";

export function inferArchitecture(input: { repo: RepoSnapshot; profile: RepositoryProfile; stack: StackDetection }): ArchitectureInference {
  const evidence: SourceRef[] = [];
  const paths = input.repo.files.map((file) => file.path);
  const hasPackages = paths.some((path) => path.startsWith("packages/"));
  const hasSrc = paths.some((path) => path.startsWith("src/"));
  const hasCli = paths.some((path) => /(^src\/cli|bin\/)/u.test(path));
  if (input.profile.type === "monorepo" || hasPackages) { evidence.push(hasPackages ? { path: "packages/", description: "workspace/package layout heuristic" } : { description: "workspace/package layout heuristic" }); return { pattern: "workspace", confidence: 0.68, evidence, heuristic: true }; }
  if (hasCli) { evidence.push({ description: "CLI entrypoint path heuristic" }); return { pattern: "cli", confidence: 0.66, evidence, heuristic: true }; }
  if (input.stack.frameworks.some((framework) => framework.name === "Express")) { evidence.push({ path: "package.json", description: "Express dependency suggests service-style app" }); return { pattern: "monolith", confidence: 0.55, evidence, heuristic: true }; }
  if (hasSrc) { evidence.push({ path: "src/", description: "source directory present" }); return { pattern: "library", confidence: 0.48, evidence, heuristic: true }; }
  return { pattern: "unknown", confidence: 0.2, evidence: [{ description: "insufficient architecture signals" }], heuristic: true };
}