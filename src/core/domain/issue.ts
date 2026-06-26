import { z } from "zod";
import { TaintedStringSchema } from "./trust.js";

export const IssueClassSchema = z.enum(["bug", "feature", "enhancement", "refactor", "chore", "docs", "question", "epic", "security", "duplicate"]);
export type IssueClass = z.infer<typeof IssueClassSchema>;

export const ResolvedIssueRefSchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
  number: z.number().int().positive(),
  url: z.string().url().optional()
});
export type ResolvedIssueRef = z.infer<typeof ResolvedIssueRefSchema>;

export const CommentSchema = z.object({ author: z.string().min(1), body: TaintedStringSchema });
export type Comment = z.infer<typeof CommentSchema>;

export const NormalizedIssueSchema = z.object({
  ref: ResolvedIssueRefSchema,
  title: TaintedStringSchema,
  body: TaintedStringSchema,
  labels: z.array(z.string()),
  assignees: z.array(z.string()).default([]),
  milestone: z.string().optional(),
  state: z.enum(["open", "closed"]),
  comments: z.array(CommentSchema).default([]),
  linkedIssues: z.array(ResolvedIssueRefSchema).default([]),
  linkedPRs: z.array(ResolvedIssueRefSchema).default([]),
  timeline: z.array(z.object({ type: z.string(), at: z.string().optional() })).default([]),
  fetchedAt: z.string().optional()
});
export type NormalizedIssue = z.infer<typeof NormalizedIssueSchema>;