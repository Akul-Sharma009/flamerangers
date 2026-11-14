// Sentences for the current-month card (Story 3.7).
//
// Every sentence the card writes is a template from contract/messages.yaml,
// filled with served values that are formatted, never computed (AD-8). The
// card's sentences are not in contract 0.3.0; they are read from an optional
// `sentences:` section so that a contract bump that adds them switches the
// card from labelled figures to sentences with no web change. The suggested
// wording is in DECISIONS.md, "Story 3.7: the card's sentences wait for
// contract 0.4.0".
import { messages } from "../api/messages";

export const SENTENCE_KEYS = [
  "current_month",
  "current_month_count",
  "current_month_usual",
  "cells_flagged",
  "ruler_caption",
  "record_high",
  "noaa20_compared",
] as const;
export type SentenceKey = (typeof SENTENCE_KEYS)[number];
export type Sentences = Partial<Record<SentenceKey, string>>;

/** The card's templates as the contract serves them today (none in 0.3.0). */
export function contractSentences(): Sentences {
  const section = (messages as unknown as { sentences?: unknown }).sentences;
  if (!section || typeof section !== "object") return {};
  const out: Sentences = {};
  for (const k of SENTENCE_KEYS) {
    const v = (section as Record<string, unknown>)[k];
    if (typeof v === "string" && v.trim() !== "") out[k] = v;
  }
  return out;
}

/** Already-formatted served values, by placeholder name. null = not served. */
export type Values = Record<string, string | null>;

/**
 * Fills `{name}` placeholders. Returns null, so the caller shows labelled
 * figures instead, when there is no template, a placeholder has no value, or
 * its value is null: a missing value is never written as 0 or left blank.
 */
export function fill(template: string | undefined, values: Values): string | null {
  if (template === undefined) return null;
  let missing = false;
  const out = template.replace(/\{([a-z_]+)\}/g, (_, name: string) => {
    const v = values[name];
    if (v === undefined || v === null) {
      missing = true;
      return "";
    }
    return v;
  });
  return missing ? null : out;
}
