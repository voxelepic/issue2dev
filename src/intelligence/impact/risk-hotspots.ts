import type { AffectedFile, RiskHotspot, StackDetection } from "../../core/domain/repository-context.js";
import type { RepoSnapshot } from "../../core/domain/repository-snapshot.js";

export function detectRiskHotspots(input: { repo: RepoSnapshot; stack: StackDetection; affectedFiles: AffectedFile[] }): RiskHotspot[] {
  const risks: RiskHotspot[] = [];
  const hasTests = input.repo.files.some((file) => /(^test\/|\.test\.|\.spec\.)/u.test(file.path));
  if (!hasTests) risks.push({ description: "No test files detected in the repository snapshot.", severity: "medium", confidence: 0.72, evidence: [{ description: "test path heuristic found no test files" }] });
  if (input.stack.packageManager === "unknown") risks.push({ description: "Unknown package manager; setup and validation commands may need manual confirmation.", severity: "low", confidence: 0.58, evidence: [{ description: "no recognized manifest or lockfile detected" }] });
  for (const file of input.affectedFiles) {
    if (/payment|auth|security|checkout/iu.test(file.path)) risks.push({ description: `Likely affected sensitive workflow file: ${file.path}`, severity: "high", confidence: Math.min(0.8, file.confidence), evidence: file.evidence });
  }
  return risks;
}