import type { IntelligenceEngine } from "../core/ports/intelligence-engine-port.js";
import type { RepositoryContext } from "../core/domain/repository-context.js";
import { NormalizedIssueSchema } from "../core/domain/issue.js";
import { RepoSnapshotSchema } from "../core/domain/repository-snapshot.js";
import { assembleRepositoryContext } from "./context/assemble.js";
import { detectStack } from "./frameworks/detect-stack.js";
import { buildRepositoryProfile } from "./repository/profile.js";

const ANALYZER_VERSIONS: Record<string, string> = {
  "frameworks.detect-stack": "0.1.0",
  "repository.profile": "0.1.0",
  "impact.affected-files": "0.1.0",
  "impact.architecture": "0.1.0",
  "impact.risk-hotspots": "0.1.0",
  "graph.builder": "0.1.0",
  "classifier.issue": "0.1.0",
  "context.assembler": "0.1.0"
};

export class DeterministicIntelligenceEngine implements IntelligenceEngine {
  async analyze(input: Parameters<IntelligenceEngine["analyze"]>[0], signal?: AbortSignal): Promise<RepositoryContext> {
    signal?.throwIfAborted();
    const repo = RepoSnapshotSchema.parse(input.repo);
    const issue = input.issue ? NormalizedIssueSchema.parse(input.issue) : undefined;
    const stack = detectStack(repo);
    const profile = buildRepositoryProfile(repo, stack);
    signal?.throwIfAborted();
    return assembleRepositoryContext({ repo, stack, profile, analyzerVersions: ANALYZER_VERSIONS, ...(issue ? { issue } : {}) });
  }
}

export function createDeterministicIntelligenceEngine(): IntelligenceEngine {
  return new DeterministicIntelligenceEngine();
}