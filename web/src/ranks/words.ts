// Words for the rankings (Story 3.9).
//
// Every sentence here is the contract's (contract/messages.yaml). None of the
// rankings' sentences is in contract 0.3.0, so each is read optionally: a
// contract bump that adds the key switches the sentence on with no web change,
// and until then the web types none (TODO(label)). Suggested wording is in
// DECISIONS.md, "Story 3.9: the rankings' sentences wait for the contract".
import { messages } from "../api/messages";

/**
 * Template keys under `sentences:`. rankings_range is not in any contract yet
 * (TODO(label)); placeholders {range_start} and {range_end} are the served
 * range's days, formatted.
 */
export const RANK_SENTENCE_KEYS = ["rankings_range"] as const;
/**
 * Keys under `notes:`. range_and_reference is in the contract 0.4.0 draft;
 * rank_tie, no_complete_month and no_complete_year are not in any contract yet
 * (TODO(label)).
 */
export const RANK_NOTE_KEYS = ["range_and_reference", "rank_tie", "no_complete_month", "no_complete_year"] as const;

export type RankWords = Partial<Record<(typeof RANK_SENTENCE_KEYS)[number] | (typeof RANK_NOTE_KEYS)[number], string>>;

function pick(section: unknown, keys: readonly string[], out: Record<string, string>) {
  if (!section || typeof section !== "object") return;
  for (const k of keys) {
    const v = (section as Record<string, unknown>)[k];
    if (typeof v === "string" && v.trim() !== "") out[k] = v;
  }
}

/** The rankings' words as the contract serves them today. */
export function contractRankWords(): RankWords {
  const out: Record<string, string> = {};
  const m = messages as unknown as { sentences?: unknown; notes?: unknown };
  pick(m.sentences, RANK_SENTENCE_KEYS, out);
  pick(m.notes, RANK_NOTE_KEYS, out);
  return out as RankWords;
}
