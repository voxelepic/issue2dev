import type { SourceRef } from "../core/domain/repository-context.js";
import type { NormalizedIssue } from "../core/domain/issue.js";
import type { RepoSnapshot } from "../core/domain/repository-snapshot.js";

export type AnalyzerInput = { repo: RepoSnapshot; issue?: NormalizedIssue };
export type AnalyzerResult<T> = { value: T; confidence: number; evidence: SourceRef[]; degraded?: { reasons: string[]; skipped?: string[] } };

export interface Analyzer<T> {
  id: string;
  version: string;
  analyze(input: AnalyzerInput, signal?: AbortSignal): Promise<AnalyzerResult<T>>;
}