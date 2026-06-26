import type { NormalizedIssue } from "../../../src/core/domain/issue.js";
import type { RepoSnapshot } from "../../../src/core/domain/repository-snapshot.js";
import { taintUntrusted } from "../../../src/core/domain/trust.js";

export const unknownIssue: NormalizedIssue = {
  ref: { owner: "acme", repo: "mystery", number: 7, url: "https://github.com/acme/mystery/issues/7" },
  title: taintUntrusted("Please improve startup behavior"),
  body: taintUntrusted("The application starts slowly, but we do not know which stack this repository uses."),
  labels: ["enhancement"],
  assignees: [],
  state: "open",
  comments: [],
  linkedIssues: [],
  linkedPRs: [],
  timeline: []
};

export const unknownRepo: RepoSnapshot = {
  ref: { owner: "acme", name: "mystery", defaultBranch: "main" },
  capped: false,
  files: [{ path: "NOTES.txt", content: taintUntrusted("Free-form project notes with no manifest or source files.") }]
};