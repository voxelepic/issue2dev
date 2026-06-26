import type { NormalizedIssue } from "../../core/domain/issue.js";
import type { AffectedFile } from "../../core/domain/repository-context.js";
import type { RepoSnapshot } from "../../core/domain/repository-snapshot.js";

const STOP_WORDS = new Set(["when", "with", "that", "this", "from", "into", "code", "issue", "error", "fails"]);
function termsFor(issue: NormalizedIssue | undefined): string[] {
  if (!issue) return [];
  return [...new Set(`${issue.title.value} ${issue.body.value} ${issue.labels.join(" ")}`.toLowerCase().split(/[^a-z0-9]+/u).filter((term) => term.length >= 4 && !STOP_WORDS.has(term)))].sort();
}

export function scoreAffectedFiles(input: { issue?: NormalizedIssue; repo: RepoSnapshot }): AffectedFile[] {
  const terms = termsFor(input.issue);
  if (terms.length === 0) return [];
  return input.repo.files.map((file) => {
    const pathText = file.path.toLowerCase();
    const contentText = file.content.value.toLowerCase();
    const pathMatches = terms.filter((term) => pathText.includes(term));
    const contentMatches = terms.filter((term) => contentText.includes(term));
    const confidence = Number(Math.min(0.92, pathMatches.length * 0.26 + contentMatches.length * 0.08).toFixed(2));
    return { path: file.path, confidence, reason: "path-match" as const, note: "heuristic" as const, evidence: [...pathMatches.map((term) => ({ path: file.path, description: `path matched issue term: ${term}` })), ...contentMatches.slice(0, 5).map((term) => ({ path: file.path, description: `content matched issue term: ${term}` }))] };
  }).filter((file) => file.confidence > 0).sort((a, b) => b.confidence - a.confidence || a.path.localeCompare(b.path)).slice(0, 10);
}