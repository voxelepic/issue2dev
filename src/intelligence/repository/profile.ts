import type { RepositoryProfile, StackDetection } from "../../core/domain/repository-context.js";
import type { RepoSnapshot } from "../../core/domain/repository-snapshot.js";

const LANGUAGE_EXTENSIONS = new Map([[".ts", "TypeScript"], [".tsx", "TypeScript"], [".js", "JavaScript"], [".jsx", "JavaScript"], [".py", "Python"], [".go", "Go"], [".rs", "Rust"]]);
function extensionOf(path: string): string { return path.match(/\.[^.\/]+$/u)?.[0] ?? ""; }
function hasPath(repo: RepoSnapshot, predicate: (path: string) => boolean): boolean { return repo.files.some((file) => predicate(file.path.toLowerCase())); }

function detectLanguages(repo: RepoSnapshot): RepositoryProfile["languages"] {
  const counts = new Map<string, number>();
  for (const file of repo.files) { const language = LANGUAGE_EXTENSIONS.get(extensionOf(file.path)); if (language) counts.set(language, (counts.get(language) ?? 0) + 1); }
  const total = [...counts.values()].reduce((sum, count) => sum + count, 0);
  if (total === 0) return [{ name: "unknown", share: 1, confidence: 0.2 }];
  return [...counts.entries()].map(([name, count]) => ({ name, share: Number((count / total).toFixed(3)), confidence: 0.75 })).sort((a, b) => b.share - a.share || a.name.localeCompare(b.name));
}

export function buildRepositoryProfile(repo: RepoSnapshot, stack: StackDetection): RepositoryProfile {
  const readme = hasPath(repo, (path) => path === "readme.md");
  const contributing = hasPath(repo, (path) => path === "contributing.md" || path.endsWith("/contributing.md"));
  const testFiles = repo.files.filter((file) => /(^test\/|\.test\.|\.spec\.)/u.test(file.path));
  const hasWorkspace = hasPath(repo, (path) => path === "pnpm-workspace.yaml" || path === "turbo.json" || path.includes("/packages/"));
  const type: RepositoryProfile["type"] = hasWorkspace ? "monorepo" : stack.frameworks.some((framework) => ["Express", "Next.js"].includes(framework.name)) ? "service" : stack.entryPoints.some((entry) => entry.path?.includes("cli")) ? "cli" : repo.files.some((file) => file.path.startsWith("src/")) ? "library" : "unknown";
  const maturitySignals = [];
  if (readme) maturitySignals.push("README present");
  if (stack.ci.length > 0) maturitySignals.push("CI workflow present");
  if (testFiles.length > 0) maturitySignals.push("tests present");
  const base = {
    ref: repo.ref,
    type,
    languages: detectLanguages(repo),
    docs: { readme, contributing, quality: readme && contributing ? "rich" as const : readme ? "sparse" as const : "none" as const },
    complexity: { value: repo.files.length > 200 ? "high" as const : repo.files.length > 40 ? "medium" as const : "low" as const, signals: [`${repo.files.length} files in snapshot`] },
    maturity: { value: maturitySignals.length >= 3 ? "mature" as const : maturitySignals.length >= 1 ? "active" as const : "early" as const, signals: maturitySignals }
  };
  if (!hasWorkspace) return base;
  return { ...base, monorepo: { tool: hasPath(repo, (path) => path === "pnpm-workspace.yaml") ? "pnpm" : "unknown", packages: [...new Set(repo.files.filter((file) => file.path.startsWith("packages/")).map((file) => file.path.split("/").slice(0, 2).join("/")))], confidence: 0.65 } };
}