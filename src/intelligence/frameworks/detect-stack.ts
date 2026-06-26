import type { SourceRef, StackDetection } from "../../core/domain/repository-context.js";
import type { RepoFile, RepoSnapshot } from "../../core/domain/repository-snapshot.js";

const CONFIG_FILE_NAMES = new Set(["package.json", "tsconfig.json", "vite.config.ts", "next.config.js", "pyproject.toml", "requirements.txt", "Cargo.toml", "go.mod"]);

function source(path: string, description: string): SourceRef { return { path, description }; }
function content(file: RepoFile): string { return file.content.value; }
function findFile(repo: RepoSnapshot, path: string): RepoFile | undefined { return repo.files.find((file) => file.path.toLowerCase() === path.toLowerCase()); }

function safePackageJson(repo: RepoSnapshot): Record<string, unknown> | undefined {
  const file = findFile(repo, "package.json");
  if (!file) return undefined;
  try { const parsed = JSON.parse(content(file)); return typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : undefined; } catch { return undefined; }
}

function packageDeps(pkg: Record<string, unknown> | undefined): string[] {
  if (!pkg) return [];
  const collect = (value: unknown) => typeof value === "object" && value ? Object.keys(value) : [];
  return [...collect(pkg.dependencies), ...collect(pkg.devDependencies), ...collect(pkg.peerDependencies)];
}

export function detectStack(repo: RepoSnapshot): StackDetection {
  const lowerPaths = new Set(repo.files.map((file) => file.path.toLowerCase()));
  const pkg = safePackageJson(repo);
  const deps = packageDeps(pkg).map((dep) => dep.toLowerCase());
  const dependencyEvidence = source("package.json", "dependency manifest");
  const frameworks = [];
  const testFrameworks = [];
  const buildSystems = [];

  if (deps.includes("express")) frameworks.push({ name: "Express", confidence: 0.86, evidence: [dependencyEvidence], heuristic: true as const });
  if (deps.includes("next")) frameworks.push({ name: "Next.js", confidence: 0.9, evidence: [dependencyEvidence], heuristic: true as const });
  if (deps.includes("react")) frameworks.push({ name: "React", confidence: 0.72, evidence: [dependencyEvidence], heuristic: true as const });
  if (deps.includes("vitest")) testFrameworks.push({ name: "Vitest", confidence: 0.9, evidence: [dependencyEvidence], heuristic: true as const });
  if (deps.includes("jest")) testFrameworks.push({ name: "Jest", confidence: 0.86, evidence: [dependencyEvidence], heuristic: true as const });
  if (deps.includes("typescript") || lowerPaths.has("tsconfig.json")) buildSystems.push({ name: "TypeScript", confidence: 0.84, evidence: [source("tsconfig.json", "TypeScript config or dependency")], heuristic: true as const });
  if (deps.includes("vite")) buildSystems.push({ name: "Vite", confidence: 0.84, evidence: [dependencyEvidence], heuristic: true as const });

  const packageManager = lowerPaths.has("pnpm-lock.yaml") ? "pnpm" : lowerPaths.has("yarn.lock") ? "yarn" : lowerPaths.has("bun.lockb") ? "bun" : lowerPaths.has("package-lock.json") || lowerPaths.has("package.json") ? "npm" : lowerPaths.has("pyproject.toml") || lowerPaths.has("requirements.txt") ? "pip" : lowerPaths.has("cargo.toml") ? "cargo" : lowerPaths.has("go.mod") ? "go" : "unknown";
  const entryPoints = repo.files.filter((file) => /^(src\/index|src\/main|src\/cli|index)\.(ts|js|tsx|jsx)$/u.test(file.path)).map((file) => source(file.path, "entry point path heuristic"));
  const configFiles = repo.files.filter((file) => CONFIG_FILE_NAMES.has(file.path.split("/").pop() ?? file.path)).map((file) => source(file.path, "known config file"));
  const workflows = repo.files.filter((file) => file.path.startsWith(".github/workflows/")).map((file) => file.path);

  return { packageManager, frameworks, testFrameworks, buildSystems, entryPoints, configFiles, ci: workflows.length > 0 ? [{ provider: "github-actions", workflows, confidence: 0.9 }] : [] };
}