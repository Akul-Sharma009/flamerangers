import type { components, paths } from "./.generated/schema";

type Pair = paths["/pair"]["get"]["responses"]["200"]["content"]["application/json"];

// Compile-time proof: the generated type has exactly these two fields.
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
const exact: Equal<Pair, { name: string; count: number }> = true;
const keys: keyof Pair = "name";
const keys2: keyof Pair = "count";
export type { components };
export { exact, keys, keys2 };
