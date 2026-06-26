import { describe, expect, it } from "vitest";
import { detectStack } from "../../src/intelligence/frameworks/detect-stack.js";
import { buildRepositoryProfile } from "../../src/intelligence/repository/profile.js";
import type { RepoSnapshot } from "../../src/core/domain/repository-snapshot.js";
import { taintUntrusted } from "../../src/core/domain/trust.js";

function repoWith(paths: string[]): RepoSnapshot {
  return {
    ref: { name: "fixture", defaultBranch: "main" },
    capped: false,
    files: paths.map((path) => ({ path, content: taintUntrusted("") }))
  };
}

function primaryLanguage(repo: RepoSnapshot): string {
  return buildRepositoryProfile(repo, detectStack(repo)).languages[0]?.name ?? "unknown";
}

describe("language detection coverage", () => {
  it("detects Python from .py files", () => {
    expect(primaryLanguage(repoWith(["main.py", "src/utils/helpers.py"]))).toBe("Python");
  });

  it("detects Go from .go files", () => {
    expect(primaryLanguage(repoWith(["main.go", "internal/server.go"]))).toBe("Go");
  });

  it("detects Java from .java files", () => {
    expect(primaryLanguage(repoWith(["src/Main.java", "src/Service.java"]))).toBe("Java");
  });

  it("detects Ruby from .rb files", () => {
    expect(primaryLanguage(repoWith(["app.rb", "lib/parser.rb"]))).toBe("Ruby");
  });

  it("detects PHP from .php files", () => {
    expect(primaryLanguage(repoWith(["index.php", "src/Controller.php"]))).toBe("PHP");
  });

  it("detects Rust from .rs files", () => {
    expect(primaryLanguage(repoWith(["src/main.rs", "src/lib.rs"]))).toBe("Rust");
  });

  it("keeps existing TypeScript detection unchanged", () => {
    expect(primaryLanguage(repoWith(["src/index.ts", "src/app.tsx"]))).toBe("TypeScript");
  });

  it("keeps existing JavaScript detection unchanged", () => {
    expect(primaryLanguage(repoWith(["index.js", "src/app.jsx"]))).toBe("JavaScript");
  });

  it("returns unknown when no recognized source files exist", () => {
    expect(primaryLanguage(repoWith(["NOTES.txt", "data.csv"]))).toBe("unknown");
  });

  it("ranks the dominant language first in a mixed repo", () => {
    const profile = buildRepositoryProfile(repoWith(["a.py", "b.py", "c.py", "x.rb"]), detectStack(repoWith(["a.py", "b.py", "c.py", "x.rb"])));
    expect(profile.languages[0]?.name).toBe("Python");
    expect(profile.languages.map((language) => language.name)).toContain("Ruby");
  });
});
