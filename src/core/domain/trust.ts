import { z } from "zod";

export const TrustLevelSchema = z.enum(["trusted", "untrusted"]);
export type TrustLevel = z.infer<typeof TrustLevelSchema>;

export const createTaintedSchema = <T extends z.ZodType>(valueSchema: T) =>
  z.object({ value: valueSchema, trust: TrustLevelSchema });

export const TaintedStringSchema = createTaintedSchema(z.string());
export type Tainted<T> = { value: T; trust: TrustLevel };

export function taintUntrusted(value: string): Tainted<string> {
  return { value, trust: "untrusted" };
}