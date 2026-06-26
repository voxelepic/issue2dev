import type { Analyzer } from "./analyzer.js";

export class IntelligenceRegistry {
  private readonly analyzers = new Map<string, Analyzer<unknown>>();

  register<T>(analyzer: Analyzer<T>): void {
    if (this.analyzers.has(analyzer.id)) throw new Error(`Analyzer already registered: ${analyzer.id}`);
    this.analyzers.set(analyzer.id, analyzer as Analyzer<unknown>);
  }

  list(): Analyzer<unknown>[] {
    return [...this.analyzers.values()].sort((a, b) => a.id.localeCompare(b.id));
  }

  versions(): Record<string, string> {
    return Object.fromEntries(this.list().map((analyzer) => [analyzer.id, analyzer.version]));
  }
}