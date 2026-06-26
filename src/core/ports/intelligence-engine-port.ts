import type { NormalizedIssue } from "../domain/issue.js";
import type { RepositoryContext } from "../domain/repository-context.js";
import type { RepoSnapshot } from "../domain/repository-snapshot.js";

export interface IntelligenceEngine {
  analyze(input: { issue?: NormalizedIssue; repo: RepoSnapshot }, signal?: AbortSignal): Promise<RepositoryContext>;
}