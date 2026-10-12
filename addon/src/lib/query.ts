/**
 * Query-string builder for Apps Script V8 (no URLSearchParams/URL there).
 * Repeated keys are kept in order, so Stripe-style arrays work:
 *   buildQuery([["expand[]", "data.customer"], ["expand[]", "data.items"]])
 */
export type QueryValue = string | number | boolean | null | undefined;
export type QueryInput = Record<string, QueryValue | QueryValue[]> | Array<[string, QueryValue]>;

export function buildQuery(input: QueryInput): string {
  const pairs: Array<[string, QueryValue]> = [];
  if (Array.isArray(input)) pairs.push(...input);
  else {
    for (const key of Object.keys(input)) {
      const v = input[key];
      if (Array.isArray(v)) for (const item of v) pairs.push([key, item]);
      else pairs.push([key, v]);
    }
  }
  return pairs
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
    .join("&");
}
