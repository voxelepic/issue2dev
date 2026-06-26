import { z } from "zod";
import { TaintedStringSchema } from "./trust.js";

export const RepoRefSchema = z.object({
  owner: z.string().optional(),
  name: z.string().min(1),
  defaultBranch: z.string().min(1).default("main"),
  rootPath: z.string().optional(),
  headSha: z.string().optional()
});
export type RepoRef = z.infer<typeof RepoRefSchema>;

export const RepoFileSchema = z.object({
  path: z.string().min(1),
  content: TaintedStringSchema,
  sizeBytes: z.number().int().nonnegative().optional()
});
export type RepoFile = z.infer<typeof RepoFileSchema>;

export const RepoSnapshotSchema = z.object({
  ref: RepoRefSchema,
  files: z.array(RepoFileSchema),
  capped: z.boolean().default(false)
});
export type RepoSnapshot = z.infer<typeof RepoSnapshotSchema>;