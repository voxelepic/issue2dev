import type { NormalizedIssue } from "../../core/domain/issue.js";
import type { IssueClassification } from "../../core/domain/repository-context.js";

export function classifyIssue(issue: NormalizedIssue | undefined): IssueClassification {
  if (!issue) return { class: "chore", confidence: 0.2, signals: ["no issue supplied"] };
  const text = `${issue.title.value} ${issue.body.value} ${issue.labels.join(" ")}`.toLowerCase();
  const rules: Array<{ class: IssueClassification["class"]; confidence: number; terms: string[] }> = [
    { class: "security", confidence: 0.86, terms: ["security", "vulnerability", "cve", "exploit"] },
    { class: "bug", confidence: 0.8, terms: ["bug", "fail", "error", "broken", "regression", "repro"] },
    { class: "docs", confidence: 0.78, terms: ["docs", "documentation", "readme"] },
    { class: "refactor", confidence: 0.74, terms: ["refactor", "cleanup", "rewrite"] },
    { class: "question", confidence: 0.7, terms: ["question", "how do", "help"] },
    { class: "feature", confidence: 0.68, terms: ["feature", "add", "support", "new"] }
  ];
  for (const rule of rules) { const matched = rule.terms.filter((term) => text.includes(term)); if (matched.length > 0) return { class: rule.class, confidence: rule.confidence, signals: matched.map((term) => `matched term: ${term}`) }; }
  return { class: "chore", confidence: 0.45, signals: ["fallback classification"] };
}